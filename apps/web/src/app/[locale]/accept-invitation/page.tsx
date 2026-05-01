'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationId = searchParams.get('id');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!invitationId) {
      setStatus('error');
      setErrorMsg("Lien d'invitation invalide ou manquant.");
      return;
    }

    async function accept() {
      try {
        const { error } = await authClient.organization.acceptInvitation({
          invitationId: invitationId!,
        });

        if (error) throw error;
        
        setStatus('success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || "Impossible d'accepter l'invitation. Peut-être est-elle expirée ?");
      }
    }

    accept();
  }, [invitationId, router]);

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      <div className="glass max-w-md w-full p-8 rounded-2xl border-white/10 text-center space-y-6">
        
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="animate-spin w-12 h-12 text-accent mx-auto" />
            <h1 className="text-xl font-semibold text-white">Validation en cours...</h1>
            <p className="text-ink-3 text-sm">Veuillez patienter pendant que nous acceptons votre invitation.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-in zoom-in duration-500">
            <CheckCircle2 className="w-16 h-16 text-pos mx-auto" />
            <h1 className="text-xl font-semibold text-white">Invitation acceptée !</h1>
            <p className="text-ink-3 text-sm">Vous allez être redirigé vers votre tableau de bord dans quelques secondes.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <XCircle className="w-16 h-16 text-neg mx-auto" />
            <h1 className="text-xl font-semibold text-white">Erreur</h1>
            <p className="text-ink-3 text-sm">{errorMsg}</p>
            <div className="pt-4">
              <Link href="/sign-in" className="inline-block px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium text-sm">
                Retour à la connexion
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
