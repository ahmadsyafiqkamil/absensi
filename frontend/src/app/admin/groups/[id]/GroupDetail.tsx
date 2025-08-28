"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Group {
  id: number;
  name: string;
  permissions: Permission[];
  user_set: User[];
  created_at?: string;
  updated_at?: string;
}

interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  last_login: string;
}

interface GroupDetailProps {
  groupId: number;
}

export default function GroupDetail({ groupId }: GroupDetailProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupDetail();
  }, [groupId]);

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/groups/${groupId}/`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch group details');
      }
      
      const data: Group = await response.json();
      setGroup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch group details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    
    if (!confirm(`Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/groups/${groupId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      // Redirect to groups list after successful deletion
      window.location.href = '/admin/groups';
    } catch (err) {
      alert(`Error deleting group: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const groupedPermissions = group?.permissions?.reduce((acc, permission) => {
    const contentType = permission.content_type;
    if (!acc[contentType]) {
      acc[contentType] = [];
    }
    acc[contentType].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Group</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchGroupDetail} variant="outline">
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
      {/* Group Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {group.name}
          </CardTitle>
          <CardDescription>Group ID: {group.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Created</h4>
              <p className="text-gray-600">
                {group.created_at ? new Date(group.created_at).toLocaleString() : 'Unknown'}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Last Updated</h4>
              <p className="text-gray-600">
                {group.updated_at ? new Date(group.updated_at).toLocaleString() : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions ({group.permissions?.length || 0})</CardTitle>
          <CardDescription>What users in this group can do</CardDescription>
        </CardHeader>
        <CardContent>
          {group.permissions && group.permissions.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([contentType, permissions]) => (
                <div key={contentType} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 capitalize">
                    {contentType.replace('_', ' ')} ({permissions.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm text-gray-700">{permission.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {permission.codename}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No permissions assigned to this group</p>
              <p className="text-sm">Users in this group will have no special access</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users in Group */}
      <Card>
        <CardHeader>
          <CardTitle>Users in Group ({group.user_set?.length || 0})</CardTitle>
          <CardDescription>Members of this group</CardDescription>
        </CardHeader>
        <CardContent>
          {group.user_set && group.user_set.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-900">Username</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-900">Full Name</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-900">Email</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-900">Status</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-900">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {group.user_set.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <div className="font-medium text-gray-900">{user.username}</div>
                        <div className="text-xs text-gray-500">ID: {user.id}</div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-gray-900">{user.email}</div>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-gray-900">
                          {new Date(user.date_joined).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.last_login ? `Last: ${new Date(user.last_login).toLocaleDateString()}` : 'Never logged in'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p>No users in this group</p>
              <p className="text-sm">Users can be assigned to this group from their profile</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-medium text-red-900">Delete Group</h4>
              <p className="text-sm text-red-700">
                This will permanently delete the group "{group.name}". Users will lose access to permissions granted by this group.
              </p>
            </div>
            <Button
              onClick={handleDeleteGroup}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400"
            >
              Delete Group
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
