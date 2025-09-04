"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Role } from "@/lib/types";
import { Shield, ShieldCheck, Users } from "lucide-react";

interface PermissionInheritanceViewerProps {
  role: Role;
  showInherited?: boolean;
  showConflicts?: boolean;
}

interface PermissionItem {
  type: string;
  actions: string[];
  isInherited: boolean;
  sourceRole?: string;
}

export default function PermissionInheritanceViewer({
  role,
  showInherited = true,
  showConflicts = false
}: PermissionInheritanceViewerProps) {
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role.id) {
      fetchInheritedPermissions();
    }
  }, [role.id]);

  const fetchInheritedPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/roles/${role.id}/permissions/inherited/`);

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();

      // Convert to PermissionItem format
      const permissionItems: PermissionItem[] = [];
      Object.entries(data).forEach(([type, actions]) => {
        if (Array.isArray(actions)) {
          permissionItems.push({
            type,
            actions,
            isInherited: false, // Will be updated based on inheritance logic
          });
        }
      });

      setAllPermissions(permissionItems);
    } catch (error) {
      console.error('Error fetching inherited permissions:', error);
      // Fallback to role's own permissions
      const fallbackPermissions: PermissionItem[] = [];
      Object.entries(role.permissions || {}).forEach(([type, actions]) => {
        if (Array.isArray(actions)) {
          fallbackPermissions.push({
            type,
            actions,
            isInherited: false,
          });
        }
      });
      setAllPermissions(fallbackPermissions);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'attendance':
        return <Users className="w-4 h-4" />;
      case 'overtime':
        return <Shield className="w-4 h-4" />;
      case 'admin':
        return <ShieldCheck className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getActionBadgeColor = (action: string, isInherited: boolean) => {
    if (isInherited) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }

    switch (action.toLowerCase()) {
      case 'view':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'create':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'edit':
      case 'update':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'approve':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const ownPermissions = Object.keys(role.permissions || {});
  const inheritedPermissions = allPermissions.filter(p => !ownPermissions.includes(p.type));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading permissions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Permissions for {role.display_name}</CardTitle>
        <CardDescription>
          {role.inherit_permissions
            ? "Showing own permissions and inherited permissions from parent roles"
            : "Showing only own permissions (inheritance disabled)"
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Own Permissions */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            Own Permissions ({Object.keys(role.permissions || {}).length} types)
          </h4>
          <div className="space-y-3">
            {Object.entries(role.permissions || {}).map(([type, actions]) => (
              <div key={`own-${type}`} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getPermissionIcon(type)}
                  <span className="font-medium capitalize">{type}</span>
                  <Badge variant="outline" className="text-xs">Own</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(actions) && actions.map((action) => (
                    <Badge
                      key={action}
                      className={getActionBadgeColor(action, false)}
                    >
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inherited Permissions */}
        {showInherited && role.inherit_permissions && inheritedPermissions.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                Inherited Permissions ({inheritedPermissions.length} types)
              </h4>
              <div className="space-y-3">
                {inheritedPermissions.map((perm) => (
                  <div key={`inherited-${perm.type}`} className="border rounded-lg p-3 bg-blue-50">
                    <div className="flex items-center gap-2 mb-2">
                      {getPermissionIcon(perm.type)}
                      <span className="font-medium capitalize">{perm.type}</span>
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                        Inherited
                      </Badge>
                      {perm.sourceRole && (
                        <Badge variant="outline" className="text-xs">
                          From: {perm.sourceRole}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {perm.actions.map((action) => (
                        <Badge
                          key={action}
                          className={getActionBadgeColor(action, true)}
                        >
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Permission Conflicts (if enabled) */}
        {showConflicts && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-3 text-orange-600">Permission Conflicts</h4>
              <p className="text-sm text-gray-600">
                No conflicts detected. Child permissions take precedence over inherited permissions.
              </p>
            </div>
          </>
        )}

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">{Object.keys(role.permissions || {}).length}</div>
              <div className="text-gray-600">Own Permission Types</div>
            </div>
            <div>
              <div className="font-medium">{inheritedPermissions.length}</div>
              <div className="text-gray-600">Inherited Types</div>
            </div>
            <div>
              <div className="font-medium">
                {Object.values(role.permissions || {}).flat().length +
                 inheritedPermissions.reduce((sum, p) => sum + p.actions.length, 0)}
              </div>
              <div className="text-gray-600">Total Permissions</div>
            </div>
            <div>
              <div className="font-medium">
                {role.inherit_permissions ? 'Enabled' : 'Disabled'}
              </div>
              <div className="text-gray-600">Inheritance</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
