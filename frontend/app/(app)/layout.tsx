'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import TopBar from '@/components/TopBar';
import MissionsPanel from '@/components/MissionsPanel';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) router.replace('/login');
  }, [loading, currentUser, router]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fafbfd' }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#fafbfd' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar des missions — persistante sur toutes les pages, ne bouge pas */}
        <MissionsPanel />
        <div className="flex flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
