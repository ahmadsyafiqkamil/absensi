"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Crown, Users, Calendar, Settings } from "lucide-react";
import Link from 'next/link';
import EmployeePositionsDisplay from '@/components/EmployeePositionsDisplay';
import PositionAssignmentForm from '@/components/PositionAssignmentForm';
import { 
  useEmployeePositions, 
  useAssignPosition, 
  useSetPrimaryPosition, 
  useDeactivatePosition,
  usePositions 
} from '@/lib/hooks';

interface Employee {
  id: number;
  nip: string;
  fullname: string;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  division?: {
    id: number;
    name: string;
  };
  position?: {
    id: number;
    name: string;
    approval_level: number;
  };
  employee_positions?: any[];
  primary_position?: any;
  approval_capabilities?: any;
}

export default function EmployeePositionsPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = parseInt(params.id as string);
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: positions } = usePositions();
  const { data: employeePositions, refetch: refetchPositions } = useEmployeePositions(employeeId);
  const { mutate: assignPosition, loading: assigning } = useAssignPosition();
  const { mutate: setPrimary } = useSetPrimaryPosition();
  const { mutate: deactivatePosition } = useDeactivatePosition();

  // Fetch employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v2/employees/employees/${employeeId}/`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch employee: ${response.statusText}`);
        }
        
        const data = await response.json();
        setEmployee(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch employee');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  const handleAssignPosition = async (data: any) => {
    try {
      await assignPosition({ ...data, employee_id: employeeId });
      refetchPositions();
      // Refresh employee data to get updated approval capabilities
      window.location.reload();
    } catch (error) {
      console.error('Failed to assign position:', error);
    }
  };

  const handleSetPrimary = async (positionId: number) => {
    try {
      await setPrimary({ employee_id: employeeId, position_id: positionId });
      refetchPositions();
      window.location.reload();
    } catch (error) {
      console.error('Failed to set primary position:', error);
    }
  };

  const handleDeactivate = async (assignmentId: number) => {
    try {
      await deactivatePosition(assignmentId);
      refetchPositions();
      window.location.reload();
    } catch (error) {
      console.error('Failed to deactivate position:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-gray-600 mt-2">{error || 'Employee not found'}</p>
          <Link href="/admin/employees" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Position Management - {employee.fullname}
            </h1>
            <p className="text-gray-600">
              NIP: {employee.nip} • Username: {employee.user.username}
            </p>
          </div>
        </div>

        {/* Employee Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                <p className="font-medium">{employee.fullname}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Division</Label>
                <p className="font-medium">{employee.division?.name || 'No Division'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">User Account</Label>
                <p className="font-medium">{employee.user.username} ({employee.user.email || 'No email'})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position Assignment Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Position Management Actions
              </span>
              <PositionAssignmentForm
                employee={employee}
                positions={positions || []}
                onSubmit={handleAssignPosition}
                loading={assigning}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign New Position
                  </Button>
                }
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Manage effective dates and assignments</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-gray-500" />
                <span>Set primary positions</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span>Track assignment history</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position Assignments Display */}
        <EmployeePositionsDisplay
          employeePositions={employee.employee_positions}
          primaryPosition={employee.primary_position}
          legacyPosition={employee.position}
          approvalCapabilities={employee.approval_capabilities}
          showActions={true}
          onSetPrimary={handleSetPrimary}
          onDeactivate={handleDeactivate}
        />

      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
