"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface RoleOption {
  value: string;
  label: string;
  group?: string;
  isPrimary?: boolean;
}

interface RoleMultiSelectProps {
  options: RoleOption[];
  selectedRoles: string[];
  primaryRole: string;
  onRolesChange: (roles: string[]) => void;
  onPrimaryRoleChange: (role: string) => void;
  placeholder?: string;
  className?: string;
}

const RoleMultiSelect = React.forwardRef<HTMLDivElement, RoleMultiSelectProps>(
  (
    {
      options,
      selectedRoles,
      primaryRole,
      onRolesChange,
      onPrimaryRoleChange,
      placeholder = "Select additional roles...",
      className,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);

    const handleRoleSelect = (roleValue: string) => {
      const newRoles = selectedRoles.includes(roleValue)
        ? selectedRoles.filter((r) => r !== roleValue)
        : [...selectedRoles, roleValue];
      onRolesChange(newRoles);
    };

    const removeRole = (roleValue: string) => {
      const newRoles = selectedRoles.filter((r) => r !== roleValue);
      onRolesChange(newRoles);
    };

    // Separate primary and additional roles
    const primaryRoles = ['admin', 'supervisor', 'pegawai'];
    const additionalRoles = options.filter(option => !primaryRoles.includes(option.value));

    const selectedOptions = options.filter(option => selectedRoles.includes(option.value));
    const selectedPrimaryRole = selectedOptions.find(option => primaryRoles.includes(option.value));
    const selectedAdditionalRoles = selectedOptions.filter(option => !primaryRoles.includes(option.value));

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {/* Primary Role Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Primary Role *</label>
          <select
            value={primaryRole || ""}
            onChange={(e) => onPrimaryRoleChange(e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select Primary Role</option>
            {options
              .filter(option => primaryRoles.includes(option.value))
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
          {primaryRole && (
            <p className="text-xs text-gray-500">
              🎯 Primary role determines main access level and permissions
            </p>
          )}
        </div>

        {/* Additional Roles Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Additional Roles (Optional)</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between min-h-10"
              >
                <span className="truncate">
                  {selectedAdditionalRoles.length === 0
                    ? placeholder
                    : `${selectedAdditionalRoles.length} additional role${selectedAdditionalRoles.length > 1 ? 's' : ''} selected`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search roles..." />
                <CommandEmpty>No roles found.</CommandEmpty>
                <CommandList>
                  <CommandGroup heading="Additional Roles">
                    {additionalRoles.map((option) => (
                      <CommandItem
                        key={option.value}
                        onSelect={() => handleRoleSelect(option.value)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedRoles.includes(option.value) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-gray-500">
            ➕ Additional roles provide extra permissions and access
          </p>
        </div>

        {/* Selected Roles Display */}
        {selectedOptions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Assigned Roles Summary</label>
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={primaryRoles.includes(option.value) ? "default" : "secondary"}
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    primaryRoles.includes(option.value) && "bg-blue-100 text-blue-800 border-blue-200",
                    !primaryRoles.includes(option.value) && "bg-gray-100 text-gray-700 border-gray-200"
                  )}
                >
                  {primaryRoles.includes(option.value) ? "🎯" : "➕"}
                  {option.label}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeRole(option.value);
                    }}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                    title="Remove role"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              <strong>Approval Level:</strong> {primaryRole === 'admin' ? '2 (Full Access)' :
                                               primaryRole === 'supervisor' ? '1 (Division Level)' :
                                               primaryRole === 'pegawai' ? '0 (Basic Access)' : 'Not set'}
            </div>
          </div>
        )}
      </div>
    );
  }
);

RoleMultiSelect.displayName = "RoleMultiSelect";

export { RoleMultiSelect, type RoleOption };


