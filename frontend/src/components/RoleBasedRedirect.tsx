"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RoleBasedRedirectProps {
  user: {
    username: string;
    groups: string[];
    is_superuser: boolean;
  } | null;
}

export default function RoleBasedRedirect({ user }: RoleBasedRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const groups = user.groups || [];
    const isAdmin = groups.includes('admin') || user.is_superuser;
    const isSupervisor = groups.includes('supervisor');

    // Redirect based on role
    if (isAdmin) {
      router.push('/admin');
    } else if (isSupervisor) {
      router.push('/supervisor');
    } else {
      router.push('/pegawai');
    }
  }, [user, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
