import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { MissionProvider } from '@/lib/mission-context';

export const metadata: Metadata = {
  title: 'AFCsoft Audit',
  description: 'Plateforme de gestion de missions d\u2019audit AFCsoft',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <MissionProvider>
            <div className="app-root">{children}</div>
          </MissionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
