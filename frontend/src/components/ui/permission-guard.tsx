import { ReactNode } from 'react'
import { useSupervisorApprovalLevel } from '@/lib/hooks'

interface PermissionGuardProps {
  children: ReactNode
  requiredLevel?: number
  fallback?: ReactNode
  showWarning?: boolean
}

export function PermissionGuard({ 
  children, 
  requiredLevel = 1, 
  fallback = null,
  showWarning = false 
}: PermissionGuardProps) {
  const { approvalLevel, isLevel0, loading } = useSupervisorApprovalLevel()

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
  }

  if (approvalLevel === null) {
    return fallback
  }

  if (approvalLevel < requiredLevel) {
    if (showWarning) {
      return (
        <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded border">
          <div className="font-medium text-orange-600">Permission Required</div>
          <div className="text-xs">
            {requiredLevel === 1 ? 'Division Level' : 'Organization Level'} approval required
          </div>
        </div>
      )
    }
    return fallback
  }

  return <>{children}</>
}

interface ApprovalButtonProps {
  onApprove: () => void
  disabled?: boolean
  loading?: boolean
  children?: ReactNode
  className?: string
}

export function ApprovalButton({ 
  onApprove, 
  disabled = false, 
  loading = false,
  children = 'Approve',
  className = ''
}: ApprovalButtonProps) {
  const { isLevel0 } = useSupervisorApprovalLevel()

  if (isLevel0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <div className="font-medium text-orange-600">No Approval Permission</div>
        <div className="text-xs">Level 0 Supervisor</div>
      </div>
    )
  }

  return (
    <button
      onClick={onApprove}
      disabled={disabled || loading}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        disabled || loading
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700 text-white'
      } ${className}`}
    >
      {loading ? 'Approving...' : children}
    </button>
  )
}

