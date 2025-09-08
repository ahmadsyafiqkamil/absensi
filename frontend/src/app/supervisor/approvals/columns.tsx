"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, XCircle, FileText, Edit, UserCheck, UserX } from "lucide-react"

interface WorkSettings {
  id: number;
  timezone: string;
  work_start_time: string;
  work_end_time: string;
  lateness_threshold_minutes: number;
  workdays: number[];
  office_latitude: string;
  office_longitude: string;
  geofence_radius_meters: number;
}

export type AttendanceCorrection = {
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
  actions?: React.ReactNode
}

// Function to format time using work settings timezone
function formatTime(timeString: string | null, workSettings?: WorkSettings | null) {
  if (!timeString) return '-';
  try {
    const date = new Date(timeString);
    const timezone = workSettings?.timezone || 'Asia/Dubai';
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });
  } catch {
    return '-';
  }
}

// Function to format date using work settings timezone
function formatDate(dateString: string, workSettings?: WorkSettings | null) {
  try {
    const date = new Date(dateString);
    const timezone = workSettings?.timezone || 'Asia/Dubai';
    return date.toLocaleDateString('id-ID', { timeZone: timezone });
  } catch {
    return dateString;
  }
}

// Function to format date and time using work settings timezone
function formatDateTime(dateString: string, workSettings?: WorkSettings | null) {
  try {
    const date = new Date(dateString);
    const timezone = workSettings?.timezone || 'Asia/Dubai';
    return {
      date: date.toLocaleDateString('id-ID', { timeZone: timezone }),
      time: date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: timezone
      })
    };
  } catch {
    return { date: dateString, time: '-' };
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

export const columns: ColumnDef<AttendanceCorrection>[] = [
  {
    accessorKey: "user",
    header: "Employee",
    cell: ({ row }) => {
      const user = row.getValue("user") as any
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {user?.first_name} {user?.last_name}
          </span>
          <span className="text-sm text-muted-foreground">
            @{user?.username}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "date_local",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date_local"))
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {date.toLocaleDateString('id-ID', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
          <span className="text-sm text-muted-foreground">
            {date.toLocaleDateString('id-ID')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as string
      return getTypeBadge(type)
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => {
      const reason = row.getValue("reason") as string
      return (
        <div className="max-w-[300px]">
          <p className="text-sm line-clamp-2">
            {reason.length > 100 ? `${reason.substring(0, 100)}...` : reason}
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: "proposed_check_in_local",
    header: "Proposed Check-in",
    cell: ({ row, table }) => {
      const checkIn = row.getValue("proposed_check_in_local") as string
      const workSettings = (table.options.meta as any)?.workSettings;
      
      if (!checkIn) return <span className="text-muted-foreground">-</span>
      
      return (
        <div className="text-sm">
          {formatTime(checkIn, workSettings)}
        </div>
      )
    },
  },
  {
    accessorKey: "proposed_check_out_local",
    header: "Proposed Check-out",
    cell: ({ row, table }) => {
      const checkOut = row.getValue("proposed_check_out_local") as string
      const workSettings = (table.options.meta as any)?.workSettings;
      
      if (!checkOut) return <span className="text-muted-foreground">-</span>
      
      return (
        <div className="text-sm">
          {formatTime(checkOut, workSettings)}
        </div>
      )
    },
  },
  {
    accessorKey: "attachment",
    header: "Attachment",
    cell: ({ row }) => {
      const attachment = row.getValue("attachment") as string
      if (!attachment) return <span className="text-muted-foreground">-</span>
      
      return (
        <div className="flex items-center">
          <FileText className="w-4 h-4 mr-2 text-blue-600" />
          <span className="text-sm text-blue-600 hover:underline cursor-pointer">
            View
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Submitted",
    cell: ({ row, table }) => {
      const dateString = row.getValue("created_at") as string
      const workSettings = (table.options.meta as any)?.workSettings;
      const { date, time } = formatDateTime(dateString, workSettings);
      
      return (
        <div className="text-sm text-muted-foreground">
          {date}
          <br />
          {time}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return getStatusBadge(status)
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      // This will be populated by the parent component
      return row.original.actions || null
    },
  },
]
