'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Logo from '@/components/Logo';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null); setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setMessage('Si cette adresse correspond à un compte actif, un code de sécurité vient d’être envoyé par email.');
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible d’envoyer le code.');
    } finally { setLoading(false); }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null); setLoading(true);
    try {
      const result = await api.verifyPasswordResetCode(email.trim(), code.trim());
      setResetToken(result.reset_token);
      setStep('password');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code incorrect.');
    } finally { setLoading(false); }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    if (newPassword !== confirmation) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      // Le serveur dépose le cookie de session dans sa réponse.
      await api.resetPassword(resetToken, newPassword);
      await refreshUser();
      if (typeof window !== 'undefined') sessionStorage.removeItem('afcsoft_security_verified');
      router.replace('/missions');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de modifier le mot de passe.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: '#f5f9ff' }}>
      <div className="w-full max-w-[420px]">
        <div className="rounded-[28px] px-8 py-10 sm:px-10" style={{ background: 'white', boxShadow: '0 24px 70px -20px rgba(37,99,235,0.22)', border: '1px solid #eef2f7' }}>
          <div className="flex justify-center mb-8"><Logo className="h-16 w-auto" /></div>
          <h1 className="text-xl font-semibold text-center mb-2" style={{ color: '#0f172a' }}>Mot de passe oublié</h1>
          <p className="text-sm text-center mb-7" style={{ color: '#64748b' }}>
            {step === 'email' && 'Indiquez votre adresse email professionnelle pour recevoir un code de sécurité.'}
            {step === 'code' && 'Saisissez le code de sécurité reçu dans votre email.'}
            {step === 'password' && 'Choisissez votre nouveau mot de passe puis confirmez-le.'}
          </p>

          {message && <div className="mb-4 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{message}</div>}
          {error && <div className="mb-4 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}

          {step === 'email' && (
            <form onSubmit={requestCode} className="space-y-4">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom.nom@afc-audit.com" className="w-full px-3.5 py-2.5 rounded-xl text-sm" style={{ border: '1.5px solid #e2e8f0' }} />
              <button disabled={loading} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white' }}>{loading ? 'Envoi…' : 'Recevoir le code'}</button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyCode} className="space-y-4">
              <input autoFocus required value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXXXXXX" maxLength={12} className="w-full px-4 py-3 rounded-xl text-center text-xl font-bold tracking-[0.3em]" style={{ border: '1.5px solid #e2e8f0', fontFamily: 'monospace' }} />
              <button disabled={loading || !code.trim()} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white' }}>{loading ? 'Vérification…' : 'Valider le code'}</button>
              <button type="button" onClick={() => { setStep('email'); setMessage(null); setError(null); }} className="w-full text-sm font-semibold" style={{ color: '#2563eb' }}>Modifier l’adresse email</button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={resetPassword} className="space-y-4">
              <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" className="w-full px-3.5 py-2.5 rounded-xl text-sm" style={{ border: '1.5px solid #e2e8f0' }} />
              <input type="password" required minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Confirmer le nouveau mot de passe" className="w-full px-3.5 py-2.5 rounded-xl text-sm" style={{ border: '1.5px solid #e2e8f0' }} />
              <button disabled={loading} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white' }}>{loading ? 'Modification…' : 'Modifier le mot de passe'}</button>
            </form>
          )}

          <button type="button" onClick={() => router.replace('/login')} className="w-full mt-5 text-sm font-semibold" style={{ color: '#64748b' }}>Retour à la connexion</button>
        </div>
      </div>
    </div>
  );
}
