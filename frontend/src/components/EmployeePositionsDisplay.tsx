"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Crown, Users, Calendar, FileText } from "lucide-react";
import type { EmployeePosition, Position, ApprovalCapabilities } from "@/lib/types";

interface EmployeePositionsDisplayProps {
  employeePositions?: EmployeePosition[];
  primaryPosition?: Position | null;
  legacyPosition?: Position | null;
  approvalCapabilities?: ApprovalCapabilities;
  showActions?: boolean;
  onEditPosition?: (positionId: number) => void;
  onSetPrimary?: (positionId: number) => void;
  onDeactivate?: (assignmentId: number) => void;
}

export default function EmployeePositionsDisplay({
  employeePositions = [],
  primaryPosition,
  legacyPosition,
  approvalCapabilities,
  showActions = false,
  onEditPosition,
  onSetPrimary,
  onDeactivate
}: EmployeePositionsDisplayProps) {
  
  // Determine positions to display
  const hasNewPositions = employeePositions.length > 0;
  const displayPositions = hasNewPositions ? employeePositions : 
    (legacyPosition ? [{
      id: 0,
      position: legacyPosition,
      is_primary: true,
      is_active: true,
      effective_from: 'Legacy',
      effective_until: null,
      assignment_notes: 'Legacy single position',
      assigned_by: null,
      created_at: '',
      updated_at: ''
    }] : []);

  const totalPositions = displayPositions.length;
  const activePositions = displayPositions.filter(p => p.is_active);
  const primaryPos = displayPositions.find(p => p.is_primary) || 
                   (primaryPosition ? { position: primaryPosition, is_primary: true } : null);

  if (totalPositions === 0) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">No positions assigned</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Position Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Positions</span>
              <div className="font-medium">{totalPositions}</div>
            </div>
            <div>
              <span className="text-gray-500">Active</span>
              <div className="font-medium text-green-600">{activePositions.length}</div>
            </div>
            <div>
              <span className="text-gray-500">Primary</span>
              <div className="font-medium">{primaryPos?.position.name || 'None'}</div>
            </div>
            <div>
              <span className="text-gray-500">Max Approval Level</span>
              <div className="font-medium">
                <Badge variant={
                  (approvalCapabilities?.approval_level || 0) >= 2 ? 'default' : 
                  (approvalCapabilities?.approval_level || 0) >= 1 ? 'secondary' : 
                  'destructive'
                }>
                  Level {approvalCapabilities?.approval_level || 0}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Position Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayPositions.map((assignment, index) => (
              <div key={assignment.id || index} className={`border rounded-lg p-3 ${!assignment.is_active ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    {/* Position Name with Primary Badge */}
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{assignment.position.name}</h4>
                      {assignment.is_primary && (
                        <Badge variant="default" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                      <Badge variant={assignment.is_active ? "secondary" : "destructive"} className="text-xs">
                        {assignment.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Position Details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Approval Level:</span>
                        <Badge variant="outline" className="ml-1 text-xs">
                          Level {assignment.position.approval_level || 0}
                        </Badge>
                      </div>
                      {assignment.effective_from !== 'Legacy' && (
                        <div>
                          <span className="font-medium">Effective From:</span>
                          <span className="ml-1">{assignment.effective_from}</span>
                        </div>
                      )}
                      {assignment.effective_until && (
                        <div>
                          <span className="font-medium">Until:</span>
                          <span className="ml-1">{assignment.effective_until}</span>
                        </div>
                      )}
                    </div>

                    {/* Assignment Notes */}
                    {assignment.assignment_notes && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Notes:</span>
                        <span className="ml-1">{assignment.assignment_notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {showActions && (
                    <div className="flex gap-2">
                      {!assignment.is_primary && assignment.is_active && onSetPrimary && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onSetPrimary(assignment.position.id)}
                        >
                          Set Primary
                        </Button>
                      )}
                      {assignment.is_active && onDeactivate && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => onDeactivate(assignment.id)}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval Capabilities */}
      {approvalCapabilities && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5" />
              Approval Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Division Level:</span>
                <Badge variant={approvalCapabilities.approval_level >= 1 ? 'default' : 'secondary'}>
                  {approvalCapabilities.approval_level >= 1 ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Organization Level:</span>
                <Badge variant={
                  approvalCapabilities.approval_level >= 2 && approvalCapabilities.can_approve_overtime_org_wide ? 'default' : 'secondary'
                }>
                  {approvalCapabilities.approval_level >= 2 && approvalCapabilities.can_approve_overtime_org_wide ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Org-wide Overtime:</span>
                <Badge variant={approvalCapabilities.can_approve_overtime_org_wide ? 'default' : 'secondary'}>
                  {approvalCapabilities.can_approve_overtime_org_wide ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
