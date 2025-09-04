"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import * as Dialog from "@radix-ui/react-dialog";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Role, EmployeeRole, RoleCategory } from "@/lib/types";

interface RoleManagementProps {
  employeeId: number;
  employeeName: string;
  currentRoles: EmployeeRole[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function RoleManagement({
  employeeId,
  employeeName,
  currentRoles,
  isOpen,
  onClose,
  onSave
}: RoleManagementProps) {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [primaryRole, setPrimaryRole] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [roleNotes, setRoleNotes] = useState<string>("");

  // Load available roles
  useEffect(() => {
    if (isOpen) {
      loadAvailableRoles();
      loadCurrentRoles();
    }
  }, [isOpen, currentRoles]);

  const loadAvailableRoles = async () => {
    try {
      setLoading(true);
      setError("");

      // NEW: Use new unified roles API
      const response = await api.admin.getRoles({ is_active: true });

      if (response.results && Array.isArray(response.results)) {
        setAvailableRoles(response.results as unknown as Role[]);
      } else if (Array.isArray(response)) {
        setAvailableRoles(response as unknown as Role[]);
      } else {
        setError("Failed to load available roles");
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
      setError("Failed to load available roles");
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentRoles = () => {
    const activeRoles = currentRoles.filter((role: EmployeeRole) => role.is_active);
    // NEW: Changed from role.group.name to role.role.name
    setSelectedRoles(activeRoles.map((role: EmployeeRole) => role.role.name));

    const primaryRoleObj = activeRoles.find((role: EmployeeRole) => role.is_primary);
    if (primaryRoleObj) {
      // NEW: Changed from role.group.name to role.role.name
      setPrimaryRole(primaryRoleObj.role.name);
    } else if (activeRoles.length > 0) {
      // If no primary role, set the first one as primary
      setPrimaryRole(activeRoles[0].role.name);
    }
  };

  const handleRoleToggle = (roleName: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles((prev: string[]) => [...prev, roleName]);
      // If this is the first role, make it primary
      if (selectedRoles.length === 0) {
        setPrimaryRole(roleName);
      }
    } else {
      setSelectedRoles((prev: string[]) => prev.filter((r: string) => r !== roleName));
      // If primary role is removed, clear it
      if (primaryRole === roleName) {
        setPrimaryRole("");
      }
    }
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      setError("Please select at least one role");
      return;
    }

    if (selectedRoles.length > 0 && !primaryRole) {
      setPrimaryRole(selectedRoles[0]);
    }

    setSaving(true);
    setError("");

    try {
      // Get current employee roles using API client
      const response = await api.admin.getEmployeeRoles({
        employee_id: employeeId
      });
      const currentEmployeeRoles: EmployeeRole[] = (response.results || response) as unknown as EmployeeRole[];

      // Remove roles that are no longer selected
      for (const currentRole of currentEmployeeRoles) {
        // NEW: Changed from currentRole.group.name to currentRole.role.name
        if (!selectedRoles.includes(currentRole.role.name)) {
          await api.admin.removeEmployeeRole(currentRole.id);
        }
      }

      // Add new roles or update existing ones
      for (const roleName of selectedRoles) {
        // NEW: Changed from r.group.name to r.role.name
        const existingRole = currentEmployeeRoles.find((r: EmployeeRole) => r.role.name === roleName);

        if (existingRole) {
          // Update existing role - set as primary if needed
          const isPrimary = roleName === primaryRole;
          if (existingRole.is_primary !== isPrimary) {
            await api.admin.updateEmployeeRole(existingRole.id, { is_primary: isPrimary });
          }
        } else {
          // Create new role
          const roleObj = availableRoles.find((r: Role) => r.name === roleName);
          if (roleObj) {
            await api.admin.assignEmployeeRole({
              employee: employeeId,
              role: roleObj.id, // NEW: Changed from 'group' to 'role'
              is_primary: roleName === primaryRole
            });
          }
        }
      }

      onSave();
      onClose();
    } catch (error) {
      setError("Failed to save roles");
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    // Color based on role category and primary status
    if (role.name === primaryRole) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }

    switch (role.role_category) {
      case 'admin':
        return "bg-red-100 text-red-800 border-red-200";
      case 'supervisor':
        return "bg-orange-100 text-orange-800 border-orange-200";
      case 'system':
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
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

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md shadow-lg w-[600px] max-w-[95vw] p-6 max-h-[80vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold mb-2">
            Manage Roles: {employeeName}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 mb-4">
            Assign multiple roles with different priorities and permissions. System roles cannot be removed.
            Primary role takes precedence in approval workflows.
          </Dialog.Description>

          <div className="space-y-6">
            {/* Current Roles Display */}
            <div>
              <Label className="text-sm font-medium">Current Roles</Label>
              <div className="space-y-2 mt-2">
                {availableRoles.filter(role => selectedRoles.includes(role.name)).map((role: Role) => (
                  <div key={role.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getRoleBadgeColor(role)} border`}>
                        {role.name === primaryRole && '🎯 '}
                        {getRoleCategoryIcon(role.role_category)} {role.display_name}
                      </Badge>
                      <span className="text-xs text-gray-500 capitalize">
                        {role.role_category}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Priority: {role.role_priority} | Users: {role.user_count}/{role.max_users || '∞'}
                    </div>
                  </div>
                ))}
                {selectedRoles.length === 0 && (
                  <span className="text-gray-500 text-sm">No roles assigned</span>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <Label className="text-sm font-medium">Available Roles</Label>
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                {availableRoles
                  .sort((a, b) => b.role_priority - a.role_priority) // Sort by priority (desc)
                  .map((role: Role) => (
                  <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedRoles.includes(role.name)}
                      onCheckedChange={(checked) => handleRoleToggle(role.name, checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {role.display_name || role.name}
                        </Label>
                        {role.is_system_role && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{getRoleCategoryIcon(role.role_category)} {role.role_category}</span>
                        <span>Priority: {role.role_priority}</span>
                        <span>Users: {role.user_count}/{role.max_users || '∞'}</span>
                        {!role.can_assign_more_users && role.max_users && (
                          <span className="text-red-600 font-medium">Full</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Role Selection */}
            {selectedRoles.length > 1 && (
              <div>
                <Label className="text-sm font-medium">Primary Role</Label>
                <p className="text-xs text-gray-600 mb-2">
                  Primary role determines main approval permissions and takes precedence in conflicts
                </p>
                <select
                  value={primaryRole}
                  onChange={(e) => setPrimaryRole(e.target.value)}
                  className="w-full h-10 border rounded px-3 text-sm"
                >
                  <option value="">Select Primary Role</option>
                  {availableRoles
                    .filter(role => selectedRoles.includes(role.name))
                    .sort((a, b) => b.role_priority - a.role_priority)
                    .map((role: Role) => (
                      <option key={role.name} value={role.name}>
                        {getRoleCategoryIcon(role.role_category)} {role.display_name} (Priority: {role.role_priority})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Roles'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


