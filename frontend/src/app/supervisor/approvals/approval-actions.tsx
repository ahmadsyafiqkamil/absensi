"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserCheck, 
  UserX, 
  Edit,
  FileText,
  Calendar,
  MessageSquare
} from 'lucide-react'

interface ApprovalActionsProps {
  correction: {
    id: number
    date_local: string
    type: string
    reason: string
    status: string
    created_at: string
    proposed_check_in_local?: string | null
    proposed_check_out_local?: string | null
    attachment?: string | null
    user?: {
      username: string
      first_name: string
      last_name: string
    }
  }
  onApprove: (id: number, decisionNote: string) => void
  onReject: (id: number, decisionNote: string) => void
  loading: boolean
  isLevel0: boolean
}

export function ApprovalActions({ 
  correction, 
  onApprove, 
  onReject, 
  loading, 
  isLevel0 
}: ApprovalActionsProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [decisionNote, setDecisionNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const isPending = correction.status === 'pending'

  // Function to get type badge
  function getTypeBadge(type: string) {
    switch (type) {
      case 'missing_check_in':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <UserCheck className="w-3 h-3 mr-1" />
          Missing Check-in
        </Badge>
      case 'missing_check_out':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <UserX className="w-3 h-3 mr-1" />
          Missing Check-out
        </Badge>
      case 'edit':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Edit className="w-3 h-3 mr-1" />
          Edit
        </Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  // Function to get status badge
  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Function to get filename from attachment path
  function getFilename(attachmentPath: string) {
    if (!attachmentPath) return ''
    const parts = attachmentPath.split('/')
    return parts[parts.length - 1] || attachmentPath
  }

  // Function to construct full media URL through proxy
  function getMediaUrl(attachmentPath: string) {
    if (!attachmentPath) return ''
    try {
      const url = new URL(attachmentPath)
      const pathname = url.pathname.startsWith('/media/') ? url.pathname : `/media${url.pathname}`
      return `/api/media${pathname}`
    } catch {
      const path = attachmentPath.startsWith('/media/') ? attachmentPath : (attachmentPath.startsWith('media/') ? `/${attachmentPath}` : `/media/${attachmentPath}`)
      return `/api/media${path}`
    }
  }

  const handleApprove = async () => {
    if (!decisionNote.trim()) {
      setDecisionNote('Disetujui')
    }
    
    setActionLoading(true)
    try {
      await onApprove(correction.id, decisionNote || 'Disetujui')
      setShowApproveDialog(false)
      setDecisionNote('')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!decisionNote.trim()) {
      setDecisionNote('Ditolak')
    }
    
    setActionLoading(true)
    try {
      await onReject(correction.id, decisionNote || 'Ditolak')
      setShowRejectDialog(false)
      setDecisionNote('')
    } finally {
      setActionLoading(false)
    }
  }

  if (isLevel0) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-gray-500">
          Level 0 - No Approval Permission
        </Badge>
      </div>
    )
  }

  if (!isPending) {
    return (
      <div className="flex items-center gap-2">
        {getStatusBadge(correction.status)}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => setShowApproveDialog(true)}
        disabled={loading || actionLoading}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        {actionLoading ? 'Processing...' : 'Approve'}
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowRejectDialog(true)}
        disabled={loading || actionLoading}
        className="border-red-300 text-red-700 hover:bg-red-50"
      >
        <XCircle className="w-4 h-4 mr-2" />
        {actionLoading ? 'Processing...' : 'Reject'}
      </Button>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approve Attendance Correction
            </DialogTitle>
            <DialogDescription>
              Review the details below and add a decision note before approving.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Correction Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Date:</span>
                <span className="text-sm">
                  {new Date(correction.date_local).toLocaleDateString('id-ID')}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Employee:</span>
                <span className="text-sm">
                  {correction.user?.first_name} {correction.user?.last_name} (@{correction.user?.username})
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Type:</span>
                {getTypeBadge(correction.type)}
              </div>
              
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                <span className="text-sm font-medium">Reason:</span>
                <span className="text-sm">{correction.reason}</span>
              </div>
            </div>

            {/* Decision Note */}
            <div className="space-y-2">
              <Label htmlFor="decision-note">Decision Note</Label>
              <Textarea
                id="decision-note"
                placeholder="Add a note about your decision (optional)"
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Attendance Correction
            </DialogTitle>
            <DialogDescription>
              Review the details below and add a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Correction Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Date:</span>
                <span className="text-sm">
                  {new Date(correction.date_local).toLocaleDateString('id-ID')}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Employee:</span>
                <span className="text-sm">
                  {correction.user?.first_name} {correction.user?.last_name} (@{correction.user?.username})
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Type:</span>
                {getTypeBadge(correction.type)}
              </div>
              
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                <span className="text-sm font-medium">Reason:</span>
                <span className="text-sm">{correction.reason}</span>
              </div>
            </div>

            {/* Rejection Reason */}
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a reason for rejection"
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading || !decisionNote.trim()}
              variant="destructive"
            >
              {actionLoading ? 'Processing...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

