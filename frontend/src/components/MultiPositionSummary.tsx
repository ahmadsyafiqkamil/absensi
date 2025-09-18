"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, TrendingUp, Shield } from "lucide-react";

interface MultiPositionSummaryProps {
  user: any;
}

export default function MultiPositionSummary({ user }: MultiPositionSummaryProps) {
  if (!user) return null;

  // Extract multi-position data
  const positions = user.positions || [];
  const approvalCapabilities = user.approval_capabilities || {};
  const primaryPosition = user.primary_position || user.position;
  
  const totalPositions = positions.length || (user.position ? 1 : 0);
  const activePositions = positions.filter((p: any) => p.is_active) || [];
  const maxApprovalLevel = approvalCapabilities.approval_level || user.position?.approval_level || 0;
  const canApproveOrgWide = approvalCapabilities.can_approve_overtime_org_wide || user.position?.can_approve_overtime_org_wide || false;

  // Calculate position distribution
  const levelDistribution = positions.reduce((acc: any, pos: any) => {
    const level = pos.position?.approval_level || 0;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Total Positions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPositions}</div>
          <p className="text-xs text-muted-foreground">
            {activePositions.length} active
          </p>
        </CardContent>
      </Card>

      {/* Primary Position */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Primary Position</CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold truncate">
            {primaryPosition?.name || 'None'}
          </div>
          <p className="text-xs text-muted-foreground">
            {primaryPosition ? `Level ${primaryPosition.approval_level || 0}` : 'No primary position'}
          </p>
        </CardContent>
      </Card>

      {/* Max Approval Level */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Max Approval Level</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{maxApprovalLevel}</div>
          <div className="flex items-center gap-1 mt-1">
            <Badge variant={maxApprovalLevel >= 2 ? 'default' : maxApprovalLevel >= 1 ? 'secondary' : 'destructive'} className="text-xs">
              Level {maxApprovalLevel}
            </Badge>
            {canApproveOrgWide && (
              <Badge variant="outline" className="text-xs">Org-wide</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Capabilities</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Division Level</span>
              <Badge variant={maxApprovalLevel >= 1 ? 'default' : 'secondary'} className="text-xs">
                {maxApprovalLevel >= 1 ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span>Organization Level</span>
              <Badge variant={maxApprovalLevel >= 2 && canApproveOrgWide ? 'default' : 'secondary'} className="text-xs">
                {maxApprovalLevel >= 2 && canApproveOrgWide ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Details (spans full width if multiple positions) */}
      {totalPositions > 1 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Position Details</CardTitle>
            <CardDescription>All assigned positions and their approval levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {positions.map((assignment: any, index: number) => (
                <div key={assignment.id || index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{assignment.position?.name}</h4>
                    <div className="flex gap-1">
                      {assignment.is_primary && (
                        <Badge variant="default" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        Level {assignment.position?.approval_level || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>From: {assignment.effective_from}</div>
                    {assignment.effective_until && (
                      <div>Until: {assignment.effective_until}</div>
                    )}
                    {assignment.assignment_notes && (
                      <div className="italic">"{assignment.assignment_notes}"</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Level Distribution */}
            <div className="mt-4 pt-4 border-t">
              <h5 className="text-sm font-medium mb-2">Approval Level Distribution</h5>
              <div className="flex gap-2">
                {Object.entries(levelDistribution).map(([level, count]) => (
                  <Badge key={level} variant="outline" className="text-xs">
                    Level {level}: {count as number}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
