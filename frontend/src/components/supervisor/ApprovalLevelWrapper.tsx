"use client"

import { useSupervisorApprovalLevel } from '@/lib/hooks'
import { ApprovalLevelWarning } from '@/components/ui/approval-level-warning'

export default function ApprovalLevelWrapper() {
  const { approvalLevel } = useSupervisorApprovalLevel()
  
  if (approvalLevel === null) {
    return null
  }
  
  return <ApprovalLevelWarning approvalLevel={approvalLevel} />
}
