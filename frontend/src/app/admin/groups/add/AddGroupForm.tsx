"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: string;
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

  // Fetch available permissions when component mounts
  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/admin/permissions/');
      if (response.ok) {
        const data = await response.json();
        setAvailablePermissions(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
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
      const response = await fetch('/api/admin/groups/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          permissions: formData.permissions
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
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([contentType, permissions]) => (
                  <div key={contentType} className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 capitalize">
                      {contentType.replace('_', ' ')} Permissions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <label key={permission.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {permission.name}
                          </span>
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
