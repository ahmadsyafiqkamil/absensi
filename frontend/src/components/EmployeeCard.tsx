import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Crown,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { EmployeeRow } from '@/components/tables/EmployeesTable';

interface EmployeeCardProps {
  employee: EmployeeRow;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRoleUpdate?: (id: number) => void;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
}

export default function EmployeeCard({
  employee,
  onEdit,
  onDelete,
  onRoleUpdate,
  isSelected = false,
  onSelect
}: EmployeeCardProps) {
  const getInitials = (name?: string | null) => {
    if (!name) return 'N/A';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (roleName: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      supervisor: 'bg-blue-100 text-blue-800',
      manager: 'bg-purple-100 text-purple-800',
      employee: 'bg-green-100 text-green-800',
      hr: 'bg-yellow-100 text-yellow-800',
    };
    return colors[roleName.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const primaryRole = employee.roles?.primary_role;
  const hasMultipleRoles = employee.roles?.total_roles && employee.roles.total_roles > 1;

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-lg ${
      isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
    }`}>
      {onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(employee.id)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                {getInitials(employee.fullname || employee.user.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {employee.fullname || employee.user.username}
              </h3>
              <p className="text-sm text-gray-600">NIP: {employee.nip}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(employee.id)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRoleUpdate?.(employee.id)}
              className="h-8 w-8 p-0"
            >
              <Crown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(employee.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="w-4 h-4 mr-2" />
            {employee.user.email}
          </div>
          {employee.division && (
            <div className="flex items-center text-sm text-gray-600">
              <Building className="w-4 h-4 mr-2" />
              {employee.division.name}
            </div>
          )}
          {employee.position && (
            <div className="flex items-center text-sm text-gray-600">
              <Crown className="w-4 h-4 mr-2" />
              {employee.position.name}
            </div>
          )}
        </div>

        {/* Roles Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Roles</span>
            {hasMultipleRoles && (
              <Badge variant="secondary" className="text-xs">
                {employee.roles?.total_roles} roles
              </Badge>
            )}
          </div>

          {/* Primary Role */}
          {primaryRole && (
            <div className="flex items-center space-x-2">
              <Badge className={`${getRoleBadgeColor(primaryRole.role?.name || '')} border`}>
                🎯 {primaryRole.role?.display_name || primaryRole.role?.name}
              </Badge>
              <span className="text-xs text-gray-500 capitalize">
                {primaryRole.role?.role_category}
              </span>
            </div>
          )}

          {/* Additional Roles */}
          {employee.roles?.active_roles && employee.roles.active_roles.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {employee.roles.active_roles
                .filter(role => !role.is_primary)
                .slice(0, 3)
                .map(employeeRole => (
                  <Badge
                    key={employeeRole.id}
                    variant="outline"
                    className="text-xs"
                  >
                    {employeeRole.role?.display_name || employeeRole.role?.name}
                  </Badge>
                ))}
              {employee.roles.active_roles.filter(role => !role.is_primary).length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{employee.roles.active_roles.filter(role => !role.is_primary).length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {employee.roles?.permissions_count || 0}
            </div>
            <div className="text-xs text-gray-600">Permissions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {employee.roles?.hierarchy_level || 0}
            </div>
            <div className="text-xs text-gray-600">Level</div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              employee.user.is_active ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-600">
              {employee.user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {employee.tmt_kerja && (
            <div className="flex items-center text-xs text-gray-600">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(employee.tmt_kerja).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
