"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCSRFHeaders } from '@/lib/csrf';

interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: string;
  permission_type: string;
  permission_action: string;
  is_active: boolean;
}

export default function AddGroupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as number[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // Fetch available permissions when component mounts
  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setPermissionsLoading(true);
      setPermissionsError(null);
      
      console.log('Fetching permissions from:', '/api/admin/permissions/');
      const response = await fetch('/api/admin/permissions/');
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Permissions data:', data);
        setAvailablePermissions(data.results || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch permissions:', response.status, errorText);
        setPermissionsError(`Failed to fetch permissions: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setPermissionsError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(id => id !== permissionId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Transform permissions to match backend format
      const selectedPermissions = availablePermissions
        .filter(perm => formData.permissions.includes(perm.id))
        .map(perm => ({
          permission_type: perm.permission_type,
          permission_action: perm.permission_action
        }));

      const response = await fetch('/api/admin/groups/', {
        method: 'POST',
        headers: await getCSRFHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          permissions: selectedPermissions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create group');
      }

      // Success - redirect to groups list
      router.push('/admin/groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    const contentType = permission.content_type;
    if (!acc[contentType]) {
      acc[contentType] = [];
    }
    acc[contentType].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Group Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Group Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter group name (e.g., admin, supervisor, pegawai)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Use lowercase letters and underscores for consistency
        </p>
      </div>

      {/* Permissions Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Permissions
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPermissions(!showPermissions)}
          >
            {showPermissions ? 'Hide' : 'Show'} Permissions
          </Button>
        </div>
        
        {showPermissions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Permissions</CardTitle>
              <CardDescription>
                Choose the permissions that users in this group will have
              </CardDescription>
            </CardHeader>
            <CardContent>
              {permissionsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading permissions...</p>
                </div>
              ) : permissionsError ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-4">
                    <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Permissions</h3>
                  <p className="text-gray-600 mb-4">{permissionsError}</p>
                  <Button onClick={fetchPermissions} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : availablePermissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No permissions available</p>
                  <p className="text-sm">Please check backend configuration</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(([contentType, permissions]) => (
                      <div key={contentType} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 capitalize">
                            {contentType.replace('_', ' ')} ({permissions.length})
                          </h4>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const permissionIds = permissions.map(p => p.id);
                                const allSelected = permissionIds.every(id => formData.permissions.includes(id));
                                if (allSelected) {
                                  setFormData(prev => ({
                                    ...prev,
                                    permissions: prev.permissions.filter(id => !permissionIds.includes(id))
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    permissions: [...new Set([...prev.permissions, ...permissionIds])]
                                  }));
                                }
                              }}
                            >
                              {permissions.every(p => formData.permissions.includes(p.id)) ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {permissions.map((permission) => (
                            <label key={permission.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(permission.id)}
                                onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="text-sm text-gray-700 font-medium">
                                  {permission.name}
                                </span>
                                <div className="text-xs text-gray-500">
                                  {permission.codename}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Selected:</strong> {formData.permissions.length} permission(s)
                    </p>
                    {formData.permissions.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Users in this group will be able to perform the selected actions
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading || !formData.name.trim()}
          className="flex-1"
        >
          {loading ? 'Creating Group...' : 'Create Group'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/groups')}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>

      {/* Form Validation Summary */}
      <div className="text-sm text-gray-600">
        <p><strong>Required fields:</strong> Group Name</p>
        <p><strong>Optional:</strong> Permissions (can be added later)</p>
      </div>
    </form>
  );
}
