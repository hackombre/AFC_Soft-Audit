'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useMission } from '@/lib/mission-context';
import Logo from './Logo';

function formatDate(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function IconButton({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
      style={{ background: active ? '#eff6ff' : 'transparent', color: active ? '#2563eb' : '#64748b' }}
    >
      {children}
      <span className="text-[11px] font-semibold">{label}</span>
    </Link>
  );
}

export default function TopBar() {
  const { currentUser, logout } = useAuth();
  const { activeEntity, activeMission } = useMission();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAssociate = currentUser?.role === 'associe';

  return (
    <header
      className="grid items-center px-6 shrink-0 z-20 relative"
      style={{ height: '72px', background: 'white', borderBottom: '1px solid #eef2f7', gridTemplateColumns: '1fr auto 1fr' }}
    >
      <Link href="/missions" className="flex items-center shrink-0">
        <Logo className="h-14 w-auto" />
      </Link>

      <div className="flex items-center justify-center">
        {activeEntity && (
          <div
            className="text-center px-8"
            style={{ borderLeft: '1px solid #eef2f7', borderRight: '1px solid #eef2f7' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
              Entité
            </p>
            <p className="text-lg font-bold tracking-wide" style={{ color: '#0f172a' }}>
              {activeEntity.sigle || activeEntity.name}
            </p>
            {activeMission && (
              <p className="text-sm font-semibold mt-0.5" style={{ color: '#2563eb' }}>
                {activeMission.name}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-6">
        <nav className="flex items-center gap-1">
          {isAssociate && (
            <IconButton href="/utilisateurs" active={pathname?.startsWith('/utilisateurs') ?? false} label="Utilisateurs">
              <svg width="19" height="19" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3.5 15c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </IconButton>
          )}
          {isAssociate && (
            <IconButton href="/modeles-guides" active={pathname?.startsWith('/modeles-guides') ?? false} label="Modèles">
              <svg width="19" height="19" viewBox="0 0 18 18" fill="none">
                <path d="M5 2.8h5l3 3v8.4a1 1 0 01-1 1H5a1 1 0 01-1-1v-10.4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M10 2.8v3h3M6.5 9h5M6.5 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </IconButton>
          )}
        </nav>

        <div className="relative pl-2" style={{ borderLeft: '1px solid #eef2f7' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-xl transition-all"
            style={{ background: menuOpen ? '#f8fafd' : 'transparent' }}
          >
            <div className="text-right hidden sm:block">
              <p className="text-base font-semibold leading-tight" style={{ color: '#0f172a' }}>
                {currentUser?.first_name} {currentUser?.last_name}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #60a5fa)', color: 'white' }}
            >
              {currentUser ? `${currentUser.first_name[0] ?? ''}${currentUser.last_name[0] ?? ''}` : ''}
            </div>
          </button>

          {menuOpen && (
            <div
              className="absolute top-full right-0 mt-2 rounded-2xl overflow-hidden z-50 py-1.5 animate-fade-in"
              style={{ width: '220px', background: 'white', border: '1px solid #eef2f7', boxShadow: '0 16px 40px rgba(37,99,235,0.14)' }}
            >
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                  {currentUser?.first_name} {currentUser?.last_name}
                </p>
                <p className="text-xs truncate" style={{ color: '#94a3b8' }}>{currentUser?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2.5 text-sm font-medium transition-all"
                style={{ color: '#ef4444' }}
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
