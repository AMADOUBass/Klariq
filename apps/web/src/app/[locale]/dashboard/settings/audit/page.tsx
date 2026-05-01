'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Loader2, 
  User as UserIcon,
  Clock,
  Activity,
  ArrowRight,
  Download,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  payload: any;
  ipAddress: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AuditLogsPage() {
  const locale = useLocale();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: activeOrg } = (authClient as any).useActiveOrganization();

  useEffect(() => {
    async function fetchLogs() {
      if (!activeOrg?.id) return;
      try {
        const data = await apiFetch<AuditLog[]>('/accounting/audit-logs', {
          headers: { 'X-Organization-Id': activeOrg.id }
        });
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [activeOrg?.id]);

  const getActionColor = (action: string) => {
    if (action.includes('CREATED')) return 'text-pos';
    if (action.includes('DELETED') || action.includes('VOIDED')) return 'text-neg';
    if (action.includes('UPDATED')) return 'text-warn';
    if (action.includes('EXPORT')) return 'text-accent';
    return 'text-white';
  };

  const handleExport = async () => {
    try {
      if (!activeOrg?.id) return;
      const data = await apiFetch<any>('/accounting/export', {
        headers: { 'X-Organization-Id': activeOrg.id }
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `klariq-ledger-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-accent" size={28} />
            Journal d'Audit
          </h1>
          <p className="text-ink-3 text-sm mt-1">Surveillez chaque action effectuée sur votre compte Klariq.</p>
        </div>

        <button 
          onClick={handleExport}
          className="h-10 px-6 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition flex items-center gap-2"
        >
          <Download size={16} />
          Exporter le Grand Livre
        </button>
      </div>

      {/* Main Table */}
      <div className="glass rounded-2xl overflow-hidden min-h-[500px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-accent" size={40} />
            <p className="text-ink-4 text-sm font-mono uppercase tracking-widest">Récupération des logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-6 text-ink-5">
              <Activity size={32} />
            </div>
            <h3 className="text-white font-medium text-lg">Aucun log trouvé</h3>
            <p className="text-ink-3 text-sm mt-2 max-w-xs">
              Les actions critiques apparaîtront ici au fur et à mesure que vous utilisez la plateforme.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="hairline-b bg-white/[0.01]">
                  <th className="px-6 py-4 text-[11px] font-bold text-ink-4 uppercase tracking-widest">Utilisateur</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-ink-4 uppercase tracking-widest">Action</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-ink-4 uppercase tracking-widest">Entité</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-ink-4 uppercase tracking-widest">IP Address</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-ink-4 uppercase tracking-widest text-right">Date & Heure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                          <UserIcon size={14} />
                        </div>
                        <div>
                          <div className="text-[13px] text-white font-medium">{log.user.name}</div>
                          <div className="text-[10px] text-ink-4">{log.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-[12px] font-mono font-semibold", getActionColor(log.action))}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[12px] text-ink-2">{log.entity}</div>
                      <div className="text-[10px] text-ink-4 font-mono">{log.entityId.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[12px] text-ink-3 font-num">{log.ipAddress || '---'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-[13px] text-white font-num">
                        {new Date(log.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA')}
                      </div>
                      <div className="text-[11px] text-ink-4 flex items-center justify-end gap-1">
                        <Clock size={10} />
                        {new Date(log.createdAt).toLocaleTimeString(locale === 'fr' ? 'fr-CA' : 'en-CA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Tip */}
      <div className="p-6 rounded-2xl border border-accent/20 bg-accent/5 flex gap-4 items-start">
        <AlertCircle className="text-accent shrink-0" size={24} />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Pourquoi ce journal est important ?</h4>
          <p className="text-[13px] text-ink-3 leading-relaxed">
            Le journal d'audit est une exigence légale pour de nombreuses juridictions. Il garantit que personne ne peut modifier les archives financières sans laisser de trace. Klariq utilise ce journal pour assurer l'immuabilité de votre comptabilité.
          </p>
        </div>
      </div>
    </div>
  );
}
