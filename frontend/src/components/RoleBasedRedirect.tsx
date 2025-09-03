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
  } | null;
}

export default function RoleBasedRedirect({ user }: RoleBasedRedirectProps) {
  const router = useRouter();
  const [roleConfigurations, setRoleConfigurations] = useState<any[]>([]);

  // Function to determine approval level from role-based system
  const getRoleBasedApprovalLevel = async (userGroups: string[]): Promise<number> => {
    try {
      // Try to get role configurations from API
      const response = await fetch('/api/admin/role-configurations/', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const configs = await response.json();
        const activeConfigs = Array.isArray(configs) ? configs : (configs.results || []);

        // Find highest approval level from user groups
        let maxLevel = 0;
        for (const group of userGroups) {
          const roleConfig = activeConfigs.find((config: any) => config.name === group && config.is_active);
          if (roleConfig && roleConfig.approval_level > maxLevel) {
            maxLevel = roleConfig.approval_level;
          }
        }
        return maxLevel;
      }
    } catch (error) {
      console.warn('Failed to fetch role configurations for redirect:', error);
    }

    // Fallback to hardcoded mapping if API fails
    const fallbackMap: { [key: string]: number } = {
      'admin': 2,
      'supervisor_kjri': 2,
      'manager': 2,
      'supervisor': 1,
      'supervisor_division': 1,
      'finance': 1,
      'hr': 1,
    };

    let maxLevel = 0;
    for (const group of userGroups) {
      const level = fallbackMap[group] || 0;
      maxLevel = Math.max(maxLevel, level);
    }
    return maxLevel;
  };

  useEffect(() => {
    const handleRedirect = async () => {
      if (!user) return;

      const groups = user.groups || [];
      const isAdmin = groups.includes('admin') || user.is_superuser;

      // NEW: Use role-based approval level
      const roleApprovalLevel = await getRoleBasedApprovalLevel(groups);

      // Fallback to position-based if no role approval
      let hasApprovalPermission = roleApprovalLevel > 0;

      if (roleApprovalLevel === 0) {
        // Only check position if no role approval found
        const position = user.position || null;
        const approvalCapabilities = getApprovalCapabilities(position);
        hasApprovalPermission = approvalCapabilities.division_level || approvalCapabilities.organization_level;
      }

      // Redirect based on role with improved logging
      if (isAdmin) {
        console.log('Redirecting to admin:', { isAdmin, groups });
        router.push('/admin');
      } else if (hasApprovalPermission) {
        console.log('Redirecting to supervisor:', {
          hasApprovalPermission,
          roleApprovalLevel,
          groups,
          position: user.position?.name || 'No position'
        });
        router.push('/supervisor');
      } else {
        console.log('Redirecting to pegawai:', {
          hasApprovalPermission,
          roleApprovalLevel,
          groups,
          position: user.position?.name || 'No position'
        });
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
