import { ReactNode } from 'react'
import { useSupervisorApprovalLevel } from '@/lib/hooks'

interface ConditionalNavigationProps {
  children: ReactNode
  requiredLevel?: number
  fallback?: ReactNode
}

export function ConditionalNavigation({ 
  children, 
  requiredLevel = 1, 
  fallback = null 
}: ConditionalNavigationProps) {
  const { approvalLevel, loading } = useSupervisorApprovalLevel()

  if (loading) {
    return null
  }

  if (approvalLevel === null || approvalLevel < requiredLevel) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export function ApprovalLevelNavigation() {
  const { approvalLevel, isLevel0 } = useSupervisorApprovalLevel()

  if (isLevel0) {
    return (
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
        <div className="font-medium text-orange-600">Limited Access</div>
        <div>View-only mode due to Level 0 approval</div>
      </div>
    )
  }

  return null
}

