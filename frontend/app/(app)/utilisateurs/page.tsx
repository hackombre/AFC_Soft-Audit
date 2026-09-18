'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import type { Role, UserOut } from '@/lib/types';
import { ROLE_LABELS, ROLE_OPTIONS } from '@/lib/types';

function initials(u: UserOut) {
  return `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase();
}

export default function UsersPage() {
  const { currentUser } = useAuth();

  const [users, setUsers] = useState<UserOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('auditeur_junior');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const list = await api.listUsers();
      setUsers(list as UserOut[]);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Impossible de charger les utilisateurs.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (currentUser && currentUser.role !== 'associe') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          Seul l&rsquo;associé peut gérer les utilisateurs.
        </p>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setSubmitting(true);

    try {
      await api.createUser({
        email: email.trim().toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        password,
      });

      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('auditeur_junior');
      setPassword('');
      setFormOpen(false);

      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible de créer l'utilisateur."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(u: UserOut, newRole: Role) {
    try {
      await api.updateUser(u.id, { role: newRole });
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Impossible de modifier le rôle.'
      );
    }
  }

  async function handleToggleActive(u: UserOut) {
    try {
      await api.updateUser(u.id, {
        is_active: !u.is_active,
      });

      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible de modifier l'état de l'utilisateur."
      );
    }
  }

  async function handleDelete(u: UserOut) {
    if (!confirm(`Supprimer ${u.first_name} ${u.last_name} ?`)) {
      return;
    }

    try {
      await api.deleteUser(u.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible de supprimer l'utilisateur."
      );
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-7 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: '#3b82f6' }}
            >
              Administration
            </p>

            <h1
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '1.7rem',
                color: '#0f172a',
                fontWeight: 500,
              }}
            >
              Utilisateurs
            </h1>
          </div>

          <button
            onClick={() => {
              setFormOpen((o) => !o);
              setError(null);
            }}
            className="text-sm font-semibold px-3.5 py-2 rounded-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #4f9cf9)',
              color: 'white',
            }}
          >
            {formOpen ? 'Fermer' : '+ Créer un utilisateur'}
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl2 p-6 mb-6 space-y-4 animate-fade-in"
            style={{ border: '1px solid #e2e8f0' }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#374151' }}
                >
                  Prénom
                </label>

                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  style={{
                    border: '1.5px solid #e2e8f0',
                    color: '#0f172a',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#374151' }}
                >
                  Nom
                </label>

                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  style={{
                    border: '1.5px solid #e2e8f0',
                    color: '#0f172a',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: '#374151' }}
              >
                Email professionnel
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@afc-audit.com"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                style={{
                  border: '1.5px solid #e2e8f0',
                  color: '#0f172a',
                }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: '#374151' }}
              >
                Rôle
              </label>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white"
                style={{
                  border: '1.5px solid #e2e8f0',
                  color: '#0f172a',
                }}
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: '#374151' }}
              >
                Mot de passe provisoire
              </label>

              <input
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 8 caractères"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                style={{
                  border: '1.5px solid #e2e8f0',
                  color: '#0f172a',
                }}
              />
            </div>

            <p className="text-xs" style={{ color: '#64748b' }}>
              Le mot de passe provisoire sera utilisé pour la première
              connexion de l&rsquo;utilisateur.
            </p>

            {error && (
              <div
                className="px-3.5 py-2.5 rounded-lg text-sm"
                style={{
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: submitting
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #2563eb, #4f9cf9)',
                color: 'white',
              }}
            >
              {submitting ? 'Création…' : "Créer l'utilisateur"}
            </button>
          </form>
        )}

        {!formOpen && error && (
          <div
            className="px-3.5 py-2.5 rounded-lg text-sm mb-6"
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}

        <div
          className="bg-white rounded-xl2 overflow-hidden"
          style={{ border: '1px solid #e2e8f0' }}
        >
          {loading && (
            <p
              className="px-5 py-4 text-sm"
              style={{ color: '#94a3b8' }}
            >
              Chargement…
            </p>
          )}

          {!loading && users.length === 0 && (
            <p
              className="px-5 py-4 text-sm"
              style={{ color: '#94a3b8' }}
            >
              Aucun utilisateur.
            </p>
          )}

          {!loading &&
            users.map((u, i) => (
              <div
                key={u.id}
                className="flex items-center gap-4 px-5 py-3.5"
                style={{
                  borderTop:
                    i === 0 ? 'none' : '1px solid #f1f5f9',
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, #2563eb, #4f9cf9)',
                    color: 'white',
                  }}
                >
                  {initials(u)}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{
                      color: u.is_active ? '#0f172a' : '#94a3b8',
                    }}
                  >
                    {u.first_name} {u.last_name}

                    {!u.is_active && (
                      <span className="ml-2 text-xs font-normal">
                        (désactivé)
                      </span>
                    )}
                  </p>

                  <p
                    className="text-xs truncate"
                    style={{ color: '#94a3b8' }}
                  >
                    {u.email}
                  </p>
                </div>

                <select
                  value={u.role}
                  onChange={(e) =>
                    handleRoleChange(
                      u,
                      e.target.value as Role
                    )
                  }
                  disabled={u.id === currentUser?.id}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white shrink-0"
                  style={{
                    border: '1.5px solid #e2e8f0',
                    color: '#1d4ed8',
                  }}
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleToggleActive(u)}
                  disabled={u.id === currentUser?.id}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg shrink-0 transition-all"
                  style={{
                    border: '1.5px solid #e2e8f0',
                    color: '#374151',
                  }}
                >
                  {u.is_active ? 'Désactiver' : 'Activer'}
                </button>

                <button
                  onClick={() => handleDelete(u)}
                  disabled={u.id === currentUser?.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-all disabled:opacity-30"
                  style={{
                    border: '1.5px solid #fecaca',
                    color: '#ef4444',
                  }}
                  aria-label="Supprimer"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M2.5 3.5h9M5.5 3.5V2h3v1.5M5.5 6.5v4M8.5 6.5v4M3.5 3.5l.5 8.5h6l.5-8.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
        </div>

        <p
          className="text-xs mt-3"
          style={{ color: '#94a3b8' }}
        >
          {ROLE_LABELS.associe} :{' '}
          {users.filter((u) => u.role === 'associe').length} · Total :{' '}
          {users.length}
        </p>
      </div>
    </div>
  );
}