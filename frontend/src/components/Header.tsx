"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  username: string;
  role: string;
}

export default function Header({ title, subtitle, username, role }: HeaderProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>(username);

  useEffect(() => {
    let cancelled = false;
    async function loadFullname() {
      try {
        // Try new V2 API first, fallback to legacy if needed
        const resp = await fetch('/api/v2/employees/me/', { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          const name = data?.fullname?.trim?.();
          if (!cancelled && name) {
            setDisplayName(name);
            return;
          }
        }
        
        // Fallback to legacy API
        const legacyResp = await fetch('/api/employee/employees', { cache: 'no-store' });
        const legacyData = await legacyResp.json().catch(() => ({}));
        const list = Array.isArray(legacyData) ? legacyData : (legacyData?.results ?? []);
        const emp = Array.isArray(list) && list.length > 0 ? list[0] : null;
        const name = emp?.fullname?.trim?.();
        if (!cancelled && name) {
          setDisplayName(name);
        } else if (!cancelled) {
          setDisplayName(username);
        }
      } catch {
        if (!cancelled) setDisplayName(username);
      }
    }
    loadFullname();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Redirect to login page
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      router.push('/login');
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'supervisor':
        return 'Supervisor';
      case 'pegawai':
        return 'Employee';
      default:
        return role;
    }
  };

  const getDashboardPath = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return '/admin';
      case 'supervisor':
        return '/supervisor';
      case 'pegawai':
        return '/pegawai';
      default:
        return '/';
    }
  };

  const handleLogoClick = () => {
    const dashboardPath = getDashboardPath(role);
    router.push(dashboardPath);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-4 flex-1">
            {/* Clickable Logo */}
            <button
              onClick={handleLogoClick}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              title="Klik untuk kembali ke dashboard"
            >
              <img 
                src="/logo_kjri_dubai.avif" 
                alt="Logo KJRI Dubai" 
                className="w-10 h-10 object-contain"
              />
              <div className="hidden sm:block">
                <h2 className="text-lg font-bold text-gray-900">KJRI Dubai</h2>
                <p className="text-xs text-gray-600">Sistem Absensi</p>
              </div>
            </button>
            
            {/* Title and subtitle */}
            {/* <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div> */}
          </div>

          {/* Right side - User info and logout */}
          <div className="flex items-center space-x-4">
            {/* User info */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{getRoleDisplayName(role)}</p>
            </div>

            {/* Logout button */}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
