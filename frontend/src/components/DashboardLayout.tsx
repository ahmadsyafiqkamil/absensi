import { ReactNode } from 'react';
import Header from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  username: string;
  role: string;
}

export default function DashboardLayout({ 
  children, 
  title, 
  subtitle, 
  username, 
  role 
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header 
        title={title}
        subtitle={subtitle}
        username={username}
        role={role}
      />
      <main className="py-8">
        {children}
      </main>
    </div>
  );
}
