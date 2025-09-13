"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApprovalCapabilities } from '@/lib/approval-utils';
import type { Position } from '@/lib/types';

interface RoleBasedRedirectProps {
  user: {
    username: string;
    groups: string[];
    is_superuser: boolean;
    position?: Position | null;
  } | null;
}

export default function RoleBasedRedirect({ user }: RoleBasedRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const groups = user.groups || [];
    const isAdmin = groups.includes('admin') || user.is_superuser;
    const isSupervisorGroup = groups.includes('supervisor');
    
    // Check position-based approval level instead of group membership
    console.log("user.position", user.position)
    const position = user.position || null;
    const approvalCapabilities = getApprovalCapabilities(position);
    const hasApprovalPermission = approvalCapabilities.division_level || approvalCapabilities.organization_level;

    // Debug logs for redirect decision
    try {
      console.log('[RoleBasedRedirect] user:', {
        username: user.username,
        groups,
        is_superuser: user.is_superuser,
      })
      console.log('[RoleBasedRedirect] position:', position)
      console.log('[RoleBasedRedirect] approvalCapabilities:', approvalCapabilities)
      console.log('[RoleBasedRedirect] flags:', { isAdmin, isSupervisorGroup, hasApprovalPermission })
    } catch {}

    // Redirect based on role
    if (isAdmin) {
      console.log('[RoleBasedRedirect] redirect -> /admin')
      router.push('/admin');
    } else if (hasApprovalPermission || isSupervisorGroup) {
      console.log('[RoleBasedRedirect] redirect -> /supervisor')
      router.push('/supervisor');
    } else {
      console.log('[RoleBasedRedirect] redirect -> /pegawai')
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
