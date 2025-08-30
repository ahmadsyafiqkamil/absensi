"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCSRFHeaders } from '@/lib/csrf';

interface Group {
  id: number;
  name: string;
  permissions: Permission[];
}

interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: string;
   permission_type: string;
  permission_action: string;
  is_active: boolean;
}

interface GroupPermissionsManagerProps {
  groupId: number;
}

export default function GroupPermissionsManager({ groupId }: GroupPermissionsManagerProps) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch group details and available permissions in parallel
      const [groupResponse, permissionsResponse] = await Promise.all([
        fetch(`/api/admin/groups/${groupId}/`, {
          credentials: 'include'
        }),
        fetch('/api/admin/permissions/', {
          credentials: 'include'
        })
      ]);
      
      if (!groupResponse.ok) {
        throw new Error('Failed to fetch group details');
      }
      
      if (!permissionsResponse.ok) {
        throw new Error('Failed to fetch permissions');
      }
      
      const groupData: Group = await groupResponse.json();
      const permissionsData = await permissionsResponse.json();
      
      setGroup(groupData);
      setAvailablePermissions(permissionsData.results || []);
      setSelectedPermissions(groupData.permissions?.map(p => p.id) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAll = (contentType: string) => {
    const permissionsToSelect = availablePermissions
      .filter(p => contentType === 'all' || p.content_type === contentType)
      .map(p => p.id);
    
    setSelectedPermissions(prev => {
      const newSelection = [...prev];
      permissionsToSelect.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  const handleDeselectAll = (contentType: string) => {
    const permissionsToDeselect = availablePermissions
      .filter(p => contentType === 'all' || p.content_type === contentType)
      .map(p => p.id);
    
    setSelectedPermissions(prev => 
      prev.filter(id => !permissionsToDeselect.includes(id))
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Transform selected permission IDs to the format expected by backend
      // Get all unique permission types from availablePermissions dynamically
      const validPermissionTypes = [...new Set(availablePermissions.map(perm => perm.permission_type))];
      
      console.log('DEBUG: selectedPermissions:', selectedPermissions);
      console.log('DEBUG: availablePermissions length:', availablePermissions.length);
      console.log('DEBUG: availablePermissions sample:', availablePermissions.slice(0, 3));
      
      // Map Django permission actions to custom permission actions
      const actionMapping: Record<string, string> = {
        'add': 'create',
        'change': 'edit',
        'delete': 'delete',
        'view': 'view'
      };

      const permissionsToUpdate = availablePermissions
        .filter(perm => selectedPermissions.includes(perm.id))
        .filter(perm => validPermissionTypes.includes(perm.permission_type))
        .map(perm => ({
          permission_type: perm.permission_type,
          permission_action: actionMapping[perm.permission_action] || perm.permission_action
        }));
      
      console.log('DEBUG: permissionsToUpdate:', permissionsToUpdate);
      console.log('DEBUG: payload to send:', { permissions: permissionsToUpdate });

      const response = await fetch(`/api/admin/groups/${groupId}/`, {
        method: 'PUT',
        headers: await getCSRFHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          permissions: permissionsToUpdate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update permissions');
      }

      // Show success message and refresh data
      alert('Permissions updated successfully!');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (group) {
      setSelectedPermissions(group.permissions?.map(p => p.id) || []);
    }
  };

  // Filter permissions based on search and content type
  const filteredPermissions = availablePermissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.codename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesContentType = contentTypeFilter === 'all' || permission.content_type === contentTypeFilter;
    return matchesSearch && matchesContentType;
  });

  // Group permissions by content type
  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const contentType = permission.content_type;
    if (!acc[contentType]) {
      acc[contentType] = [];
    }
    acc[contentType].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Get unique content types for filter
  const contentTypes = ['all', ...Array.from(new Set(availablePermissions.map(p => p.content_type)))];

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!group) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Group not found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {group.name}
          </CardTitle>
          <CardDescription>
            Currently has {selectedPermissions.length} permission(s) selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{availablePermissions.length}</div>
              <div className="text-sm text-gray-600">Total Available</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{selectedPermissions.length}</div>
              <div className="text-sm text-gray-600">Currently Selected</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {availablePermissions.length - selectedPermissions.length}
              </div>
              <div className="text-sm text-gray-600">Available to Add</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>Find and filter permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Permissions
              </label>
              <input
                type="text"
                placeholder="Search by name or codename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type Filter
              </label>
              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {contentTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Permissions</CardTitle>
              <CardDescription>
                Select permissions to assign to this group
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(contentTypeFilter)}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeselectAll(contentTypeFilter)}
              >
                Deselect All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.entries(groupedPermissions).map(([contentType, permissions]) => (
            <div key={contentType} className="mb-6 last:mb-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 capitalize">
                  {contentType.replace('_', ' ')} ({permissions.length})
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(contentType)}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeselectAll(contentType)}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {permissions.map((permission) => (
                  <label
                    key={permission.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPermissions.includes(permission.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {permission.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {permission.codename}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          
          {filteredPermissions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No permissions found matching your search criteria</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Save Changes</CardTitle>
          <CardDescription>
            Review your changes and save the new permission configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Permission Summary</h4>
              <p className="text-sm text-gray-600">
                {selectedPermissions.length} permission(s) will be assigned to group "{group.name}"
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                Reset to Original
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
