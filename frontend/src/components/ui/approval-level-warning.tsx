import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ApprovalLevelWarningProps {
  approvalLevel: number
  className?: string
}

export function ApprovalLevelWarning({ approvalLevel, className = '' }: ApprovalLevelWarningProps) {
  if (approvalLevel === null) return null

  const getLevelInfo = (level: number) => {
    switch (level) {
      case 0:
        return {
          title: 'No Approval Permission',
          description: 'You do not have permission to approve any requests. You can only view data.',
          icon: XCircle,
          variant: 'destructive' as const,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 1:
        return {
          title: 'Division Level Approval',
          description: 'You can approve requests from your division members only.',
          icon: CheckCircle,
          variant: 'default' as const,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 2:
        return {
          title: 'Organization Level Approval',
          description: 'You can approve requests from all divisions (final approval).',
          icon: CheckCircle,
          variant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      default:
        return {
          title: 'Unknown Approval Level',
          description: 'Your approval level is not configured properly.',
          icon: AlertTriangle,
          variant: 'destructive' as const,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        }
    }
  }

  const levelInfo = getLevelInfo(approvalLevel)
  const IconComponent = levelInfo.icon

  return (
    <Alert className={`${levelInfo.bgColor} ${levelInfo.borderColor} ${className}`}>
      <IconComponent className={`h-4 w-4 ${levelInfo.color}`} />
      <AlertTitle className={levelInfo.color}>{levelInfo.title}</AlertTitle>
      <AlertDescription className="text-gray-700">
        {levelInfo.description}
      </AlertDescription>
    </Alert>
  )
}

