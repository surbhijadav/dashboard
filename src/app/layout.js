import './globals.css';
import { Inter } from 'next/font/google';
import { WorkspaceProvider } from '@/context/WorkspaceContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'Enterprise Multi-Tenant Workspace Dashboard',
  description: 'Next.js, MongoDB & Node.js Multi-Tenant Company Workspace Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-app text-ink antialiased">
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
