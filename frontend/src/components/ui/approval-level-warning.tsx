"use client"

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface ApprovalLevelWarningProps {
  approvalLevel: number | null
  className?: string
}

export function ApprovalLevelWarning({ approvalLevel, className }: ApprovalLevelWarningProps) {
  if (approvalLevel === null) {
    return null
  }

  if (approvalLevel === 0) {
    return (
      <Alert className={cn("border-yellow-200 bg-yellow-50", className)}>
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Level 0 - No Approval Permission</AlertTitle>
        <AlertDescription className="text-yellow-700">
          You can view pending corrections but cannot approve or reject them. 
          Contact your administrator to upgrade your permission level.
        </AlertDescription>
      </Alert>
    )
  }

  if (approvalLevel === 1) {
    return (
      <Alert className={cn("border-green-200 bg-green-50", className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Level 1 - Can Approve</AlertTitle>
        <AlertDescription className="text-green-700">
          You have permission to approve or reject attendance corrections from your team members.
        </AlertDescription>
      </Alert>
    )
  }

  if (approvalLevel >= 2) {
    return (
      <Alert className={cn("border-blue-200 bg-blue-50", className)}>
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Level {approvalLevel} - Admin Level</AlertTitle>
        <AlertDescription className="text-blue-700">
          You have full administrative permissions for attendance corrections.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

