'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Une erreur est survenue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden px-4" style={{ background: '#f5f9ff' }}>
      {/* soft decorative blobs — light, not dark */}
      <div
        className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.10), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-48 -right-40 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.16), transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full pointer-events-none hidden lg:block"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08), transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-[920px] grid lg:grid-cols-2 rounded-[28px] overflow-hidden" style={{ background: 'white', boxShadow: '0 24px 70px -20px rgba(37,99,235,0.22)' }}>
        {/* Left — brand / value prop, light theme */}
        <div
          className="hidden lg:flex flex-col justify-between p-11 relative"
          style={{ background: 'linear-gradient(160deg, #eff6ff 0%, #dbeafe 100%)' }}
        >
          <div
            className="absolute top-10 right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.14), transparent 70%)' }}
          />

          <Logo className="h-12 w-auto relative z-10" />

          <div className="relative z-10">
            <p
              className="mb-4"
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '2.2rem',
                lineHeight: 1.18,
                color: '#0f172a',
                fontWeight: 500,
              }}
            >
              Vos missions d&rsquo;audit, du plan de mission à la synthèse finale.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
              Acceptation, planification, exécution, finalisation — un seul
              questionnaire, structuré par étapes, partagé par toute l&rsquo;équipe.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium" style={{ color: '#2563eb' }}>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'white' }}>Acceptation</span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'white' }}>Planification</span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'white' }}>Exécution</span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'white' }}>Finalisation</span>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex items-center justify-center px-7 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <Logo className="h-11 w-auto" />
            </div>

            <h1 className="text-2xl font-semibold mb-1.5" style={{ color: '#0f172a' }}>
              Connexion
            </h1>
            <p className="text-sm mb-8" style={{ color: '#64748b' }}>
              Connectez-vous avec votre adresse email professionnelle.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
                  Email professionnel
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@cabinet.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all"
                  style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }}
                  onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #2563eb')}
                  onBlur={(e) => (e.currentTarget.style.border = '1.5px solid #e2e8f0')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm transition-all"
                    style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }}
                    onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #2563eb')}
                    onBlur={(e) => (e.currentTarget.style.border = '1.5px solid #e2e8f0')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94a3b8' }}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-4.5 6-4.5S14 8 14 8s-2.5 4.5-6 4.5S2 8 2 8z" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M2.5 2.5l11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-4.5 6-4.5S14 8 14 8s-2.5 4.5-6 4.5S2 8 2 8z" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="px-3.5 py-2.5 rounded-xl text-sm animate-fade-in"
                  style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all mt-2"
                style={{
                  background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f9cf9)',
                  color: 'white',
                  boxShadow: submitting ? 'none' : '0 10px 24px -6px rgba(37,99,235,0.45)',
                }}
              >
                {submitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>

            <p className="text-xs mt-8 text-center" style={{ color: '#94a3b8' }}>
              Accès réservé aux membres du cabinet. Contactez votre associé pour
              obtenir un compte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
