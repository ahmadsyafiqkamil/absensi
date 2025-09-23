"use client"

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAvailableContexts, useSwitchPosition } from '@/lib/hooks'
import { Loader2, Users, ArrowRightLeft } from 'lucide-react'

interface PositionContext {
  assignment_id: number
  position_id: number
  position_name: string
  approval_level: number
  can_approve_overtime_org_wide: boolean
  is_primary: boolean
  is_current: boolean
  effective_from: string
  effective_until: string | null
}

export function PositionSwitcher() {
  const { data: availableContexts, loading, error } = useAvailableContexts()
  const { mutate: switchPosition, loading: switching } = useSwitchPosition()
  const [currentPositionId, setCurrentPositionId] = useState<number | null>(null)

  // Update current position when contexts change
  useEffect(() => {
    if (availableContexts?.length) {
      const currentContext = availableContexts.find((ctx: any) => ctx.is_current)
      setCurrentPositionId(currentContext?.position_id || null)
    }
  }, [availableContexts])

  const handlePositionChange = (positionId: string) => {
    if (positionId === 'null') {
      switchPosition(null) // Reset to primary
    } else {
      switchPosition(parseInt(positionId))
    }
  }

  const getApprovalLevelBadge = (level: number) => {
    switch (level) {
      case 0:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Level 0</Badge>
      case 1:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Level 1</Badge>
      case 2:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Level 2</Badge>
      default:
        return <Badge variant="outline">Level {level}</Badge>
    }
  }

  const getApprovalDescription = (level: number) => {
    switch (level) {
      case 0:
        return 'No Approval - Tidak dapat melakukan approval apapun'
      case 1:
        return 'Division Level - Dapat approve request dari divisi sendiri'
      case 2:
        return 'Organization Level - Dapat approve request dari semua divisi (final approval)'
      default:
        return 'Unknown Level - Level approval tidak dikenali'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-600">Loading available positions...</span>
      </div>
    )
  }

  if (error || !availableContexts?.length) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">
            {error ? 'Error loading positions' : 'No positions available'}
          </span>
        </div>
      </div>
    )
  }

  const currentContext = availableContexts.find((ctx: any) => ctx.is_current)
  const currentLevel = currentContext?.approval_level || 0

  return (
    <div className="space-y-4">
      {/* Current Position Display */}
      <div className="flex items-center justify-between p-4 bg-white border rounded-lg">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="w-5 h-5 text-blue-600" />
          <div>
            <div className="font-medium text-gray-900">
              Current Position: {currentContext?.position_name || 'No Position'}
            </div>
            <div className="text-sm text-gray-600">
              {getApprovalDescription(currentLevel)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getApprovalLevelBadge(currentLevel)}
          {currentContext?.can_approve_overtime_org_wide && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Org-wide
            </Badge>
          )}
        </div>
      </div>

      {/* Position Switcher */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Switch to:</span>
        <Select 
          value={currentPositionId?.toString() || 'null'} 
          onValueChange={handlePositionChange} 
          disabled={switching}
        >
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Select position..." />
          </SelectTrigger>
          <SelectContent>
            {availableContexts.map((context: PositionContext) => (
              <SelectItem 
                key={context.position_id} 
                value={context.position_id.toString()}
                disabled={context.is_current}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{context.position_name}</span>
                    {context.is_primary && (
                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                    )}
                    {context.is_current && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getApprovalLevelBadge(context.approval_level)}
                    {context.can_approve_overtime_org_wide && (
                      <Badge variant="outline" className="text-xs">Org-wide</Badge>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {switching && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Switching...</span>
          </div>
        )}
      </div>

      {/* Available Positions Summary */}
      <div className="text-xs text-gray-500">
        Available positions: {availableContexts.length} • 
        Current: {currentContext?.position_name} (Level {currentLevel}) • 
        Primary: {availableContexts.find((ctx: any) => ctx.is_primary)?.position_name || 'None'}
      </div>
    </div>
  )
}
