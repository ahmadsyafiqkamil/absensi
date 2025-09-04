"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { Role, RoleCategory } from "@/lib/types";

interface RolesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Role[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchRoles();
  }, [currentPage]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/roles/?page=${currentPage}&page_size=${pageSize}`);

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data: RolesResponse = await response.json();
      setRoles(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const getRoleCategoryIcon = (category: RoleCategory) => {
    switch (category) {
      case 'admin':
        return '👑';
      case 'supervisor':
        return '👨‍💼';
      case 'system':
        return '⚙️';
      default:
        return '👤';
    }
  };

  const getRoleCategoryColor = (category: RoleCategory) => {
    switch (category) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'supervisor':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'system':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleToggleActive = async (roleId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}/toggle_active/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role status');
      }

      // Refresh the roles list
      fetchRoles();
    } catch (err) {
      alert(`Error updating role: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteRole = async (roleId: number, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/roles/${roleId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete role');
      }

      // Refresh the roles list
      fetchRoles();
    } catch (err) {
      alert(`Error deleting role: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Roles</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchRoles} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600 mt-1">Manage system roles and permissions</p>
        </div>
        <Link href="/admin/roles/add">
          <Button className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Role
          </Button>
        </Link>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Roles</CardTitle>
          <CardDescription>View and manage all system roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Role Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Priority</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Users</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Max Users</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No roles found.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{role.display_name}</div>
                        <div className="text-xs text-gray-500">{role.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${getRoleCategoryColor(role.role_category)} border`}>
                          {getRoleCategoryIcon(role.role_category)} {role.role_category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-900">{role.role_priority}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-900">{role.user_count}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-900">
                          {role.max_users ? role.max_users : '∞'}
                        </span>
                        {role.max_users && role.user_count >= role.max_users && (
                          <span className="text-xs text-red-600 ml-1">(Full)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={role.is_active ? "default" : "secondary"}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {role.is_system_role && (
                          <div className="text-xs text-purple-600 mt-1">System Role</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Link href={`/admin/roles/${role.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <Link href={`/admin/roles/${role.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(role.id, role.is_active)}
                          >
                            {role.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          {!role.is_system_role && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRole(role.id, role.display_name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="text-sm text-gray-600 text-center">
        Total Roles: {totalCount}
      </div>
    </div>
  );
}
