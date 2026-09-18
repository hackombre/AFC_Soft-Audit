'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import TopBar from '@/components/TopBar';
import MissionsPanel from '@/components/MissionsPanel';
import SecurityCodeRevealModal from '@/components/SecurityCodeRevealModal';
import SecurityCodeGateModal from '@/components/SecurityCodeGateModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, newSecurityCode, clearNewSecurityCode } = useAuth();
  const router = useRouter();
  const [securityGateOpen, setSecurityGateOpen] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
      return;
    }
    if (!loading && currentUser?.must_change_password) {
      router.replace('/change-password');
      return;
    }
    if (!loading && currentUser && typeof window !== 'undefined') {
      setSecurityGateOpen(sessionStorage.getItem('afcsoft_security_verified') !== '1');
    }
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
      {newSecurityCode && (
        <SecurityCodeRevealModal code={newSecurityCode} onClose={() => {
          clearNewSecurityCode();
          setSecurityGateOpen(true);
        }} />
      )}
      {securityGateOpen && !newSecurityCode && (
        <SecurityCodeGateModal
          open
          onClose={() => {}}
          onSuccess={() => {
            if (typeof window !== 'undefined') sessionStorage.setItem('afcsoft_security_verified', '1');
            setSecurityGateOpen(false);
          }}
        />
      )}
    </div>
  );
}
