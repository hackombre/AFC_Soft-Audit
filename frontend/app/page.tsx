'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(currentUser ? '/missions' : '/login');
  }, [loading, currentUser, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafd' }}>
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
