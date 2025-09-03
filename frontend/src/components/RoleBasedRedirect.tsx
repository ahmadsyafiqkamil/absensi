"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApprovalCapabilities } from '@/lib/approval-utils';
import type { Position } from '@/lib/types';

interface RoleBasedRedirectProps {
  user: {
    username: string;
    groups: string[];
    is_superuser: boolean;
    position?: Position | null;
    approval_level?: number;  // NEW: From unified role system
    multi_roles?: {
      active_roles: string[];
      primary_role?: string;
      has_multiple_roles: boolean;
    };
  } | null;
}

export default function RoleBasedRedirect({ user }: RoleBasedRedirectProps) {
  const router = useRouter();
  const [roleConfigurations, setRoleConfigurations] = useState<any[]>([]);

  // Function to determine approval level from unified role system
  const getUnifiedApprovalLevel = (user: any): number => {
    // NEW: Use backend-calculated approval level from unified system
    if (user.approval_level !== undefined) {
      console.log('Using backend-calculated approval level:', user.approval_level);
      return user.approval_level;
    }

    // Fallback to legacy systems if backend doesn't provide approval_level
    if (user.multi_roles && user.multi_roles.active_roles) {
      // Check for admin/supervisor roles
      const adminRoles = ['admin', 'level_2_approver', 'supervisor_kjri', 'manager'];
      const supervisorRoles = ['supervisor', 'level_1_approver', 'supervisor_division', 'finance', 'hr'];

      if (user.multi_roles.active_roles.some((role: string) => adminRoles.includes(role))) {
        return 2;
      }
      if (user.multi_roles.active_roles.some((role: string) => supervisorRoles.includes(role))) {
        return 1;
      }
    }

    // Legacy group-based fallback
    const groups = user.groups || [];
    const adminGroups = ['admin', 'supervisor_kjri', 'manager'];
    const supervisorGroups = ['supervisor', 'supervisor_division', 'finance', 'hr'];

    if (groups.some((group: string) => adminGroups.includes(group))) {
      return 2;
    }
    if (groups.some((group: string) => supervisorGroups.includes(group))) {
      return 1;
    }

    return 0;
  };

  useEffect(() => {
    const handleRedirect = () => {
      if (!user) return;

      const groups = user.groups || [];
      const isAdmin = groups.includes('admin') || user.is_superuser;

      // NEW: Use unified approval level from backend
      const approvalLevel = getUnifiedApprovalLevel(user);
      const hasApprovalPermission = approvalLevel > 0;

      console.log('Unified redirect logic:', {
        username: user.username,
        isAdmin,
        approvalLevel,
        hasApprovalPermission,
        groups,
        multiRoles: user.multi_roles,
        approval_level: user.approval_level
      });

      // Redirect based on role with improved logging
      if (isAdmin) {
        console.log('🔄 Redirecting to admin dashboard');
        router.push('/admin');
      } else if (hasApprovalPermission) {
        console.log('🔄 Redirecting to supervisor dashboard');
        router.push('/supervisor');
      } else {
        console.log('🔄 Redirecting to employee dashboard');
        router.push('/pegawai');
      }
    };

    handleRedirect();
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
