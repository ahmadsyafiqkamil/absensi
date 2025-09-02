"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import { Badge } from "@/components/ui/badge";

interface Role {
  id: number;
  name: string;
}

interface EmployeeRole {
  id: number;
  group: Role;
  is_primary: boolean;
  is_active: boolean;
}

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

  // Load available roles
  useEffect(() => {
    if (isOpen) {
      loadAvailableRoles();
      loadCurrentRoles();
    }
  }, [isOpen, currentRoles]);

  const loadAvailableRoles = async () => {
    try {
      const response = await fetch('/api/admin/groups');
      if (response.ok) {
        const data = await response.json();
        const roles = Array.isArray(data) ? data : (data.results || []);
        setAvailableRoles(roles);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadCurrentRoles = () => {
    const activeRoles = currentRoles.filter(role => role.is_active);
    setSelectedRoles(activeRoles.map(role => role.group.name));

    const primaryRoleObj = activeRoles.find(role => role.is_primary);
    if (primaryRoleObj) {
      setPrimaryRole(primaryRoleObj.group.name);
    } else if (activeRoles.length > 0) {
      // If no primary role, set the first one as primary
      setPrimaryRole(activeRoles[0].group.name);
    }
  };

  const handleRoleToggle = (roleName: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles(prev => [...prev, roleName]);
      // If this is the first role, make it primary
      if (selectedRoles.length === 0) {
        setPrimaryRole(roleName);
      }
    } else {
      setSelectedRoles(prev => prev.filter(r => r !== roleName));
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
      // Get current employee roles
      const currentRoleResponse = await fetch(`/api/admin/employee-roles/?employee=${employeeId}`);
      const currentRoleData = await currentRoleResponse.json();
      const currentEmployeeRoles = Array.isArray(currentRoleData) ? currentRoleData : (currentRoleData.results || []);

      // Remove roles that are no longer selected
      for (const currentRole of currentEmployeeRoles) {
        if (!selectedRoles.includes(currentRole.group.name)) {
          await fetch(`/api/admin/employee-roles/${currentRole.id}`, {
            method: 'DELETE'
          });
        }
      }

      // Add new roles or update existing ones
      for (const roleName of selectedRoles) {
        const existingRole = currentEmployeeRoles.find(r => r.group.name === roleName);

        if (existingRole) {
          // Update existing role
          const isPrimary = roleName === primaryRole;
          if (existingRole.is_primary !== isPrimary) {
            await fetch(`/api/admin/employee-roles/${existingRole.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_primary: isPrimary })
            });
          }
        } else {
          // Create new role
          const roleObj = availableRoles.find(r => r.name === roleName);
          if (roleObj) {
            await fetch('/api/admin/employee-roles/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employee: employeeId,
                group: roleObj.id,
                is_primary: roleName === primaryRole
              })
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

  const getRoleBadgeColor = (roleName: string) => {
    if (roleName === primaryRole) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-700";
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
            Assign roles and set primary role for this employee
          </Dialog.Description>

          <div className="space-y-6">
            {/* Current Roles Display */}
            <div>
              <Label className="text-sm font-medium">Current Roles</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedRoles.map(roleName => (
                  <Badge key={roleName} className={getRoleBadgeColor(roleName)}>
                    {roleName === primaryRole ? `🎯 ${roleName}` : roleName}
                  </Badge>
                ))}
                {selectedRoles.length === 0 && (
                  <span className="text-gray-500 text-sm">No roles assigned</span>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <Label className="text-sm font-medium">Available Roles</Label>
              <div className="grid grid-cols-2 gap-3 mt-2 max-h-60 overflow-y-auto">
                {availableRoles.map(role => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedRoles.includes(role.name)}
                      onCheckedChange={(checked) => handleRoleToggle(role.name, checked as boolean)}
                    />
                    <Label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {role.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Role Selection */}
            {selectedRoles.length > 1 && (
              <div>
                <Label className="text-sm font-medium">Primary Role</Label>
                <p className="text-xs text-gray-600 mb-2">
                  Primary role determines main approval permissions
                </p>
                <select
                  value={primaryRole}
                  onChange={(e) => setPrimaryRole(e.target.value)}
                  className="w-full h-10 border rounded px-3 text-sm"
                >
                  <option value="">Select Primary Role</option>
                  {selectedRoles.map(roleName => (
                    <option key={roleName} value={roleName}>
                      {roleName}
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
