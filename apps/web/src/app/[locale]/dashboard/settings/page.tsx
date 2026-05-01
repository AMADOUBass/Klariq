'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Hash, 
  Upload, 
  Save, 
  CheckCircle2, 
  Loader2,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

interface Company {
  name: string;
  legalName: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  taxNumberGst: string | null;
  taxNumberQst: string | null;
}

import { authClient } from '@/lib/auth-client';
import { QRCodeSVG } from 'qrcode.react';

type SettingsTab = 'general' | 'security' | 'team';

export default function SettingsPage() {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // 2FA State
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'IDLE' | 'ENABLING' | 'VERIFYING'>('IDLE');
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error2fa, setError2fa] = useState('');

  const { data: session } = authClient.useSession();

  const { data: activeOrg } = (authClient as any).useActiveOrganization();

  const myRole = activeOrg?.members?.find((m: any) => m.userId === session?.user?.id)?.role;
  const isAccountant = myRole === 'accountant';

  useEffect(() => {
    async function fetchCompany() {
      if (!activeOrg?.id) return;
      try {
        const data = await apiFetch<Company>('/accounting/company', {
          headers: { 'X-Organization-Id': activeOrg.id }
        });
        setCompany(data);
        setIsTwoFactorEnabled(!!session?.user?.twoFactorEnabled);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompany();
  }, [session, activeOrg?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      if (!activeOrg?.id) return;
      await apiFetch('/accounting/company', {
        method: 'PATCH',
        headers: { 'X-Organization-Id': activeOrg.id },
        body: JSON.stringify(company),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEnable2FA = async () => {
    setError2fa('');
    setTwoFactorStep('ENABLING');
    try {
      const { data, error } = await authClient.twoFactor.enable({
        issuer: 'Klariq'
      });
      if (error) throw error;
      setQrCodeUri(data.totpURI);
      setTwoFactorStep('VERIFYING');
    } catch (err: any) {
      setError2fa(err.message || 'Failed to start 2FA setup');
      setTwoFactorStep('IDLE');
    }
  };

  const handleVerify2FA = async () => {
    setError2fa('');
    try {
      const { error } = await authClient.twoFactor.verifyTotp({
        code: totpCode
      });
      if (error) throw error;
      setIsTwoFactorEnabled(true);
      setTwoFactorStep('IDLE');
      setQrCodeUri('');
      setTotpCode('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError2fa(err.message || 'Invalid code');
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver la 2FA ?')) return;
    try {
      const { error } = await authClient.twoFactor.disable();
      if (error) throw error;
      setIsTwoFactorEnabled(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Paramètres</h1>
          <p className="text-ink-3 text-sm mt-1">Gérez votre profil d'entreprise et votre sécurité.</p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-xl border border-white/10">
          <Link 
            href="/dashboard/settings/audit"
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-ink-3 hover:text-white transition"
          >
            <ShieldCheck size={16} />
            Journal
          </Link>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button 
            onClick={() => setActiveTab('general')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition",
              activeTab === 'general' ? "bg-accent text-white shadow-lg" : "text-ink-3 hover:text-white"
            )}
          >
            Général
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition",
              activeTab === 'security' ? "bg-accent text-white shadow-lg" : "text-ink-3 hover:text-white"
            )}
          >
            Sécurité
          </button>
          <button 
            onClick={() => setActiveTab('team')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition",
              activeTab === 'team' ? "bg-accent text-white shadow-lg" : "text-ink-3 hover:text-white"
            )}
          >
            Équipe
          </button>
        </div>
      </div>

      {activeTab === 'general' ? (
        <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Profile Section */}
          <div className="glass rounded-2xl p-8 border-white/[0.05] space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Building2 size={20} />
              </div>
              <h3 className="text-lg font-medium text-white">Identité de l'entreprise</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-ink-3 ml-1">Nom légal</label>
                <input 
                  type="text" 
                  value={company?.legalName || ''}
                  onChange={e => setCompany(prev => ({ ...prev!, legalName: e.target.value }))}
                  placeholder="Ex: Klariq Technologies Inc."
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-4 text-white placeholder:text-ink-5 focus:border-accent/50 focus:ring-0 transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-ink-3 ml-1">Téléphone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input 
                    type="text" 
                    value={company?.phone || ''}
                    onChange={e => setCompany(prev => ({ ...prev!, phone: e.target.value }))}
                    placeholder="+1 (514) 000-0000"
                    className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 text-white placeholder:text-ink-5 focus:border-accent/50 focus:ring-0 transition"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[13px] font-medium text-ink-3 ml-1">Adresse physique</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input 
                    type="text" 
                    value={company?.address || ''}
                    onChange={e => setCompany(prev => ({ ...prev!, address: e.target.value }))}
                    placeholder="123 Rue de la Bourse, Montréal, QC H2Y 1Y1"
                    className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 text-white placeholder:text-ink-5 focus:border-accent/50 focus:ring-0 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tax Section */}
          <div className="glass rounded-2xl p-8 border-white/[0.05] space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Hash size={20} />
              </div>
              <h3 className="text-lg font-medium text-white">Fiscalité (Canada/Québec)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-ink-3 ml-1 text-blue-400">Numéro de TPS (ARC)</label>
                <input 
                  type="text" 
                  value={company?.taxNumberGst || ''}
                  onChange={e => setCompany(prev => ({ ...prev!, taxNumberGst: e.target.value }))}
                  placeholder="123456789 RT 0001"
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-4 text-white placeholder:text-ink-5 focus:border-blue-500/50 focus:ring-0 transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-ink-3 ml-1 text-purple-400">Numéro de TVQ (Revenu Québec)</label>
                <input 
                  type="text" 
                  value={company?.taxNumberQst || ''}
                  onChange={e => setCompany(prev => ({ ...prev!, taxNumberQst: e.target.value }))}
                  placeholder="1234567890 TQ 0001"
                  className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-4 text-white placeholder:text-ink-5 focus:border-purple-500/50 focus:ring-0 transition"
                />
              </div>
            </div>
          </div>

          {/* Logo Section */}
          <div className="glass rounded-2xl p-8 border-white/[0.05] space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <ImageIcon size={20} />
              </div>
              <h3 className="text-lg font-medium text-white">Identité Visuelle</h3>
            </div>

            <div className="flex items-center gap-8">
              <div className="w-24 h-24 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center overflow-hidden">
                {company?.logoUrl ? (
                  <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon size={32} className="text-ink-5" />
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-ink-3 ml-1">URL du Logo (S3/Public)</label>
                  <input 
                    type="text" 
                    value={company?.logoUrl || ''}
                    onChange={e => setCompany(prev => ({ ...prev!, logoUrl: e.target.value }))}
                    placeholder="https://bucket.s3.amazonaws.com/logo.png"
                    className="w-full h-11 bg-white/[0.03] border border-white/10 rounded-xl px-4 text-white placeholder:text-ink-5 focus:border-orange-500/50 focus:ring-0 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2 text-pos transition-opacity duration-300" style={{ opacity: success ? 1 : 0 }}>
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">Modifications enregistrées !</span>
            </div>

            <button 
              type="submit"
              disabled={saving || isAccountant}
              className="h-12 px-8 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 disabled:opacity-50 transition shadow-lg flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Enregistrer les modifications
            </button>
          </div>
        </form>
      ) : activeTab === 'security' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 2FA Card */}
          <div className="glass rounded-2xl p-8 border-white/[0.05] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-pos/10 border border-pos/20 flex items-center justify-center text-pos">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Authentification à deux facteurs (2FA)</h3>
                  <p className="text-ink-3 text-sm">Protégez votre compte avec une application d'authentification (TOTP).</p>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                isTwoFactorEnabled ? "bg-pos/20 text-pos border border-pos/30" : "bg-white/10 text-ink-3 border border-white/20"
              )}>
                {isTwoFactorEnabled ? 'Activé' : 'Désactivé'}
              </div>
            </div>

            {twoFactorStep === 'IDLE' && (
              <div className="pt-4">
                {isTwoFactorEnabled ? (
                  <button 
                    onClick={handleDisable2FA}
                    className="h-10 px-6 rounded-xl border border-neg/50 text-neg text-sm font-medium hover:bg-neg/5 transition"
                  >
                    Désactiver la 2FA
                  </button>
                ) : (
                  <button 
                    onClick={handleEnable2FA}
                    className="h-10 px-6 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition"
                  >
                    Configurer la 2FA
                  </button>
                )}
              </div>
            )}

            {twoFactorStep === 'VERIFYING' && (
              <div className="pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="bg-white p-4 rounded-xl w-fit mx-auto md:mx-0 shadow-2xl">
                  {qrCodeUri && <QRCodeSVG value={qrCodeUri} size={180} />}
                </div>
                <div className="space-y-4 text-center md:text-left">
                  <h4 className="text-white font-medium">Scannez le code QR</h4>
                  <p className="text-sm text-ink-3">Utilisez Google Authenticator, Authy ou toute application TOTP pour scanner ce code, puis saisissez le code à 6 chiffres ci-dessous.</p>
                  <div className="space-y-2 max-w-[200px] mx-auto md:mx-0">
                    <input 
                      type="text" 
                      maxLength={6}
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value)}
                      placeholder="000 000"
                      className="w-full h-12 bg-white/[0.05] border border-white/10 rounded-xl text-center text-xl font-bold tracking-[0.5em] text-white focus:border-accent transition"
                    />
                    {error2fa && <p className="text-[10px] text-neg text-center">{error2fa}</p>}
                    <button 
                      onClick={handleVerify2FA}
                      className="w-full h-10 mt-2 bg-pos text-white text-sm font-bold rounded-lg hover:bg-pos/90 transition"
                    >
                      Vérifier & Activer
                    </button>
                    <button 
                      onClick={() => setTwoFactorStep('IDLE')}
                      className="w-full text-[11px] text-ink-4 hover:text-white transition mt-2 underline"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'team' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="glass rounded-2xl p-8 border-white/[0.05] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Membres de l'équipe</h3>
                  <p className="text-ink-3 text-sm">Gérez les accès et les rôles de votre organisation.</p>
                </div>
              </div>
              {!isAccountant && (
                <button 
                  onClick={() => {
                    const email = prompt('Adresse email du membre à inviter:');
                    if (!email) return;
                    const role = prompt('Rôle (owner, admin, accountant):', 'accountant');
                    if (!role) return;
                    authClient.organization.inviteMember({ email, role }).then(() => {
                      alert('Invitation envoyée !');
                    }).catch((err: any) => alert(err.message));
                  }}
                  className="h-10 px-4 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition shadow-lg"
                >
                  + Inviter un membre
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-ink-4 text-xs font-medium">
                    <th className="pb-3 font-medium">Membre</th>
                    <th className="pb-3 font-medium">Rôle</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {activeOrg?.members?.map((member: any) => (
                    <tr key={member.id} className="group">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white">
                            {member.user?.name?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-medium">{member.user?.name || 'Utilisateur'}</div>
                            <div className="text-ink-4 text-xs">{member.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider",
                          member.role === 'owner' ? "bg-pos/10 text-pos" :
                          member.role === 'admin' ? "bg-blue-500/10 text-blue-400" :
                          "bg-purple-500/10 text-purple-400"
                        )}>
                          {member.role}
                        </span>
                      </td>
                      <td className="py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isAccountant && (
                          <button 
                            onClick={() => {
                              if (!confirm('Retirer ce membre ?')) return;
                              authClient.organization.removeMember({ memberIdOrEmail: member.id }).then(() => {
                                window.location.reload();
                              });
                            }}
                            className="text-neg hover:text-neg/80 text-xs font-medium"
                          >
                            Retirer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
