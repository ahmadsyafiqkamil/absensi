'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OvertimeStatus } from '@/components/ui/overtime-status'
import { ApprovalLevelWarning } from '@/components/ui/approval-level-warning'
import { PermissionGuard, ApprovalButton } from '@/components/ui/permission-guard'
import { useSupervisorApprovalLevel } from '@/lib/hooks'
import { formatCurrency, formatDate, formatTime, formatDuration } from '@/app/utils/formatters'

interface OvertimeRecord {
  id: number
  date: string
  weekday: string
  employee: {
    name: string
    nip: string
    division: string
  }
  check_in: string
  check_out: string
  total_work_minutes: number
  required_minutes: number
  overtime_minutes: number
  overtime_amount: number
  is_holiday: boolean
  overtime_approved: boolean
  approved_by: string | null
  approved_at: string | null
}

interface OvertimeReport {
  summary: {
    total_records: number
    total_overtime_minutes: number
    total_overtime_amount: number
    pending_overtime_count: number
    average_overtime_per_day: number
  }
  overtime_records: OvertimeRecord[]
  filters: any
}

interface SupervisorInfo {
  division: string
  employeeCount: number
}

export default function OvertimeApprovalsClient() {
  const { approvalLevel, canApprove, isLevel0, loading: approvalLevelLoading } = useSupervisorApprovalLevel()
  const [overtimeData, setOvertimeData] = useState<OvertimeReport | null>(null)
  const [supervisorInfo, setSupervisorInfo] = useState<SupervisorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchSupervisorInfo()
  }, [])

  useEffect(() => {
    fetchOvertimeData()
  }, [filter, dateRange])

  const fetchSupervisorInfo = async () => {
    try {
      const response = await fetch('/api/employee/employees/')
      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const employeeData = data.results[0]
          setSupervisorInfo({
            division: employeeData.division?.name || 'Unknown Division',
            employeeCount: 0
          })
        }
      }
    } catch (error) {
      console.error('Error fetching supervisor info:', error)
    }
  }

  const fetchOvertimeData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filter === 'pending') {
        params.append('pending_only', 'true')
      } else if (filter === 'approved') {
        params.append('approved_only', 'true')
      }

      if (dateRange.startDate) params.append('start_date', dateRange.startDate)
      if (dateRange.endDate) params.append('end_date', dateRange.endDate)

      const response = await fetch(`/api/overtime/report?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setOvertimeData(data)
      } else {
        console.error('Failed to fetch overtime data')
      }
    } catch (error) {
      console.error('Error fetching overtime data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveOvertime = async (id: number) => {
    if (isLevel0) {
      return // Level 0 supervisors cannot approve
    }

    setApproving(id)
    try {
      const response = await fetch(`/api/overtime/approve/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Refresh data after approval
        fetchOvertimeData()
      } else {
        console.error('Failed to approve overtime')
      }
    } catch (error) {
      console.error('Error approving overtime:', error)
    } finally {
      setApproving(null)
    }
  }

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  if (loading || approvalLevelLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!overtimeData) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No overtime data available</div>
      </div>
    )
  }

  const pendingRecords = overtimeData.overtime_records.filter(record => !record.overtime_approved)
  const approvedRecords = overtimeData.overtime_records.filter(record => record.overtime_approved)

  return (
    <div className="space-y-6">
      {/* Approval Level Warning */}
      {approvalLevel !== null && (
        <ApprovalLevelWarning approvalLevel={approvalLevel} />
      )}

      {/* Division Information */}
      {supervisorInfo && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Division Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-blue-600 font-medium">Your Division</div>
                <div className="text-lg font-semibold text-blue-800">{supervisorInfo.division}</div>
              </div>
              <div>
                <div className="text-sm text-blue-600 font-medium">Team Members with Overtime</div>
                <div className="text-lg font-semibold text-blue-800">{supervisorInfo.employeeCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Overtime Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overtimeData.summary.total_records}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Overtime Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(overtimeData.summary.total_overtime_minutes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Overtime Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overtimeData.summary.total_overtime_amount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overtimeData.summary.pending_overtime_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Date Range Filter</CardTitle>
          <CardDescription>Filter overtime records by specific date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setDateRange({ startDate: '', endDate: '' })}
                className="px-4 py-2"
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Buttons */}
      <div className="flex space-x-2">
        <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>
          Pending ({pendingRecords.length})
        </Button>
        <Button variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>
          Approved ({approvedRecords.length})
        </Button>
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          All ({overtimeData.overtime_records.length})
        </Button>
      </div>

      {/* Overtime Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'pending' ? 'Pending Overtime Approvals' : filter === 'approved' ? 'Approved Overtime Records' : 'All Overtime Records'}
          </CardTitle>
          <CardDescription>
            {filter === 'pending' ? 'Review and approve overtime requests from your division members' : filter === 'approved' ? 'Previously approved overtime records' : 'Complete overtime history for your division'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overtimeData.overtime_records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No overtime records found for the selected criteria</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Employee</th>
                    <th className="text-left py-3 px-2">Division</th>
                    <th className="text-left py-3 px-2">Work Hours</th>
                    <th className="text-left py-3 px-2">Overtime</th>
                    <th className="text-left py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimeData.overtime_records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{formatDate(record.date)}</div>
                          <div className="text-sm text-gray-500">{record.weekday}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{record.employee.name}</div>
                          <div className="text-sm text-gray-500">NIP: {record.employee.nip}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{record.employee.division}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{formatDuration(record.total_work_minutes)}</div>
                          <div className="text-sm text-gray-500">{formatTime(record.check_in)} - {formatTime(record.check_out)}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-orange-600 font-medium">+{formatDuration(record.overtime_minutes)}</div>
                        <div className="text-sm text-gray-500">Required: {formatDuration(record.required_minutes)}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium">{formatCurrency(record.overtime_amount)}</div>
                      </td>
                      <td className="py-3 px-2">
                        <OvertimeStatus approved={record.overtime_approved} />
                      </td>
                      <td className="py-3 px-2">
                        {!record.overtime_approved ? (
                          <ApprovalButton
                            onApprove={() => handleApproveOvertime(record.id)}
                            disabled={approving === record.id}
                            loading={approving === record.id}
                            className="w-full"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">
                            <div className="font-medium text-green-600">✓ Approved</div>
                            <div>by: {record.approved_by}</div>
                            {record.approved_at && (<div className="text-xs">{formatDate(record.approved_at)}</div>)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
