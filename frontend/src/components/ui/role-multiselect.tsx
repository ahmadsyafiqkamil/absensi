"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Primary Role *
          </label>
          <Select value={primaryRole || ""} onValueChange={onPrimaryRoleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Primary Role" />
            </SelectTrigger>
            <SelectContent>
              {options
                .filter(option => primaryRoles.includes(option.value))
                .map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {primaryRole && (
            <p className="text-xs text-muted-foreground">
              🎯 Primary role determines main access level and permissions
            </p>
          )}
        </div>

        {/* Additional Roles Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Additional Roles (Optional)
          </label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between min-h-10 h-10 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate">
                  {selectedAdditionalRoles.length === 0
                    ? placeholder
                    : `${selectedAdditionalRoles.length} additional role${selectedAdditionalRoles.length > 1 ? 's' : ''} selected`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start" side="bottom">
              <Command>
                <CommandInput placeholder="Search roles..." />
                <CommandEmpty>No roles found.</CommandEmpty>
                <CommandList className="max-h-60">
                  {/* Group roles by their category */}
                  {Array.from(new Set(additionalRoles.map(role => role.group)))
                    .filter(group => group)
                    .map((group) => (
                      <CommandGroup key={group} heading={`${group} Roles`}>
                        {additionalRoles
                          .filter(option => option.group === group)
                          .map((option) => (
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
                    ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            ➕ Additional roles provide extra permissions and access. You can search and select multiple roles.
          </p>
        </div>

        {/* Selected Roles Display */}
        {selectedOptions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Assigned Roles Summary
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={primaryRoles.includes(option.value) ? "default" : "secondary"}
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    primaryRoles.includes(option.value) && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
                    !primaryRoles.includes(option.value) && "bg-muted text-muted-foreground border-border hover:bg-muted/80"
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
            <div className="text-xs text-muted-foreground mt-2">
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

export { RoleMultiSelect };


