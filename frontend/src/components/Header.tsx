"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  subtitle?: string;
  username: string;
  role: string;
}

export default function Header({ title, subtitle, username, role }: HeaderProps) {
  const router = useRouter();

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

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side - Title and subtitle */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>

          {/* Right side - User info and logout */}
          <div className="flex items-center space-x-4">
            {/* User info */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{username}</p>
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
