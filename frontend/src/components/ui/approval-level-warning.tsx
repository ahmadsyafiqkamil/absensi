"use client"

import { AlertTriangle, CheckCircle, XCircle, Shield, Users, Building } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ApprovalLevelWarningProps {
  approvalLevel: number | null
  userGroups?: string[]
  className?: string
  showDetails?: boolean
  roleConfigurations?: any[]
}

export function ApprovalLevelWarning({
  approvalLevel,
  userGroups = [],
  className,
  showDetails = false,
  roleConfigurations = []
}: ApprovalLevelWarningProps) {
  if (approvalLevel === null) {
    return null
  }

  // Determine approval source using dynamic role configurations
  let approvalSource = 'Position-based'
  let highestRoleConfig = null

  if (roleConfigurations.length > 0 && userGroups.length > 0) {
    // Find the highest approval level role configuration that user has
    let maxLevel = 0
    for (const group of userGroups) {
      const roleConfig = roleConfigurations.find(config => config.name === group && config.is_active)
      if (roleConfig && roleConfig.approval_level > maxLevel) {
        maxLevel = roleConfig.approval_level
        highestRoleConfig = roleConfig
        approvalSource = `Role: ${roleConfig.display_name} (Level ${roleConfig.approval_level})`
      }
    }
  } else {
    // Fallback to simple role detection
    const hasAdminRole = userGroups.includes('admin')
    const hasManagerRole = userGroups.includes('manager')
    const hasSupervisorRole = userGroups.some(group =>
      group.includes('supervisor') || group === 'finance' || group === 'hr'
    )

    approvalSource = hasAdminRole ? 'Role: Admin' :
                    hasManagerRole ? 'Role: Manager' :
                    hasSupervisorRole ? 'Role: Supervisor' :
                    'Position-based'
  }

  if (approvalLevel === 0) {
    return (
      <Alert className={cn("border-yellow-200 bg-yellow-50", className)}>
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Level 0 - No Approval Permission</AlertTitle>
        <AlertDescription className="text-yellow-700">
          You can view pending corrections but cannot approve or reject them.
          {showDetails && (
            <div className="mt-2">
              <div className="text-xs">Source: {approvalSource}</div>
              {userGroups.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {userGroups.map(group => (
                    <Badge key={group} variant="outline" className="text-xs">
                      {group}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (approvalLevel === 1) {
    return (
      <Alert className={cn("border-green-200 bg-green-50", className)}>
        <Users className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Level 1 - Division Level Approval</AlertTitle>
        <AlertDescription className="text-green-700">
          You can approve attendance corrections from members in your division.
          {showDetails && (
            <div className="mt-2">
              <div className="text-xs">Source: {approvalSource}</div>
              {userGroups.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {userGroups.map(group => (
                    <Badge key={group} variant="outline" className="text-xs">
                      {group}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (approvalLevel >= 2) {
    return (
      <Alert className={cn("border-blue-200 bg-blue-50", className)}>
        <Building className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Level {approvalLevel} - Organization Level Approval</AlertTitle>
        <AlertDescription className="text-blue-700">
          You have full administrative permissions to approve corrections from all divisions.
          {showDetails && (
            <div className="mt-2">
              <div className="text-xs">Source: {approvalSource}</div>
              {userGroups.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {userGroups.map(group => (
                    <Badge key={group} variant="outline" className="text-xs">
                      {group}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

// New component to display role configurations
export function RoleConfigurationsDisplay({ roleConfigurations = [], className }: {
  roleConfigurations?: any[],
  className?: string
}) {
  if (roleConfigurations.length === 0) {
    return null
  }

  const activeConfigs = roleConfigurations.filter(config => config.is_active)

  return (
    <div className={cn("mt-4 p-4 bg-gray-50 rounded-lg border", className)}>
      <h4 className="text-sm font-semibold text-gray-800 mb-3">Role Configuration Mapping</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeConfigs.map((config: any) => (
          <div key={config.id} className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex-1">
              <div className="font-medium text-sm">{config.display_name}</div>
              <div className="text-xs text-gray-500">{config.name}</div>
              {config.group && (
                <Badge variant="outline" className="text-xs mt-1">
                  {config.group}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <Badge
                variant={
                  config.approval_level === 0 ? "secondary" :
                  config.approval_level === 1 ? "default" :
                  "destructive"
                }
                className="text-xs"
              >
                Level {config.approval_level}
              </Badge>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-gray-500">
        Total active roles: {activeConfigs.length}
      </div>
    </div>
  )
}

