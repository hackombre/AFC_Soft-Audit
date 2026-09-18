'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import Modal from './Modal';

export default function SecurityCodeGateModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotDone, setForgotDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.verifySecurityCode(code.trim());
      setCode('');
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code incorrect.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setSubmitting(true);
    try {
      await api.forgotSecurityCode(email.trim(), password);
      setForgotDone(true);
      setForgotOpen(false);
      setCode('');
    } catch (err) {
      setForgotError(err instanceof ApiError ? err.message : 'Impossible de renouveler le code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={() => { setCode(''); setError(null); onClose(); }}
        title="Code de sécurité requis"
        subtitle="Ce code est demandé après chaque nouvelle authentification"
        maxWidth="400px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            maxLength={12}
            className="w-full px-4 py-3 rounded-xl text-center text-xl font-bold tracking-[0.3em]"
            style={{ border: '1.5px solid #e2e8f0', color: '#0f172a', fontFamily: 'monospace' }}
          />

          {error && <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
          {forgotDone && <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>Un nouveau code a été envoyé à votre adresse professionnelle. Saisissez-le ci-dessus.</div>}

          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white' }}
          >
            {submitting ? 'Vérification…' : 'Valider'}
          </button>

          <button
            type="button"
            onClick={() => { setForgotOpen(true); setForgotError(null); }}
            className="w-full text-sm font-semibold"
            style={{ color: '#2563eb' }}
          >
            Code oublié ?
          </button>
        </form>
      </Modal>

      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Code oublié ?" subtitle="Une vérification est nécessaire avant d'envoyer un nouveau code" maxWidth="430px">
        <form onSubmit={handleForgot} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@afc-audit.com"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm"
            style={{ border: '1.5px solid #e2e8f0' }}
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Votre mot de passe"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm"
            style={{ border: '1.5px solid #e2e8f0' }}
          />
          {forgotError && <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{forgotError}</div>}
          <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white' }}>
            {submitting ? 'Vérification…' : 'Recevoir un nouveau code'}
          </button>
        </form>
      </Modal>
    </>
  );
}
