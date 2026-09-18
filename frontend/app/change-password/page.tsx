'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import Logo from '@/components/Logo';

export default function ChangePasswordPage() {
  const { currentUser, refreshUser } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!currentUser) {
    router.replace('/login');
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmation) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      await refreshUser();
      router.replace('/missions');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de modifier le mot de passe.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f5f9ff' }}>
      <div className="w-full max-w-md rounded-[28px] bg-white px-8 py-10" style={{ border: '1px solid #eef2f7', boxShadow: '0 24px 70px -20px rgba(37,99,235,0.22)' }}>
        <div className="flex justify-center mb-7"><Logo className="h-16 w-auto" /></div>
        <h1 className="text-xl font-semibold text-center mb-2" style={{ color: '#0f172a' }}>Changer votre mot de passe</h1>
        <p className="text-sm text-center mb-7" style={{ color: '#64748b' }}>Votre mot de passe provisoire doit être remplacé avant d'accéder à l'application.</p>
        <form onSubmit={submit} className="space-y-4">
          <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Mot de passe provisoire" className="w-full px-3.5 py-2.5 rounded-xl text-sm" style={{ border: '1.5px solid #e2e8f0' }} />
          <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" className="w-full px-3.5 py-2.5 rounded-xl text-sm" style={{ border: '1.5px solid #e2e8f0' }} />
          <input type="password" required minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Confirmer le nouveau mot de passe" className="w-full px-3.5 py-2.5 rounded-xl text-sm" style={{ border: '1.5px solid #e2e8f0' }} />
          {error && <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
          <button disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
