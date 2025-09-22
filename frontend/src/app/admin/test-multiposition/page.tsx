"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, CheckCircle, AlertCircle } from "lucide-react";

interface Position {
  id: number;
  name: string;
  approval_level: number;
  can_approve_overtime_org_wide: boolean;
}

interface Employee {
  id: number;
  nip: string;
  fullname: string;
  user: {
    username: string;
  };
  employee_positions: Array<{
    id: number;
    position: Position;
    is_primary: boolean;
    is_active: boolean;
    effective_from: string;
    effective_until: string | null;
  }>;
}

export default function TestMultiPositionPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees with multi-position data
      const employeeResponse = await fetch('/api/admin/employees');
      const employeeData = await employeeResponse.json();
      const employeeList = Array.isArray(employeeData) ? employeeData : (employeeData?.results ?? []);
      
      // Fetch positions
      const positionResponse = await fetch('/api/admin/positions');
      const positionData = await positionResponse.json();
      const positionList = Array.isArray(positionData) ? positionData : (positionData?.results ?? []);
      
      setEmployees(employeeList);
      setPositions(positionList);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getApprovalLevelBadge = (level: number) => {
    const variant = level >= 2 ? 'default' : level >= 1 ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="text-xs">
        Level {level}
      </Badge>
    );
  };

  const getMultiPositionEmployees = () => {
    return employees.filter(emp => emp.employee_positions && emp.employee_positions.length > 1);
  };

  const getSinglePositionEmployees = () => {
    return employees.filter(emp => !emp.employee_positions || emp.employee_positions.length <= 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading multi-position data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Multi-Position System Test</h1>
          <p className="text-gray-600">Validation of multi-position assignment functionality</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Multi-Position</p>
                  <p className="text-2xl font-bold text-green-600">{getMultiPositionEmployees().length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Single Position</p>
                  <p className="text-2xl font-bold text-gray-600">{getSinglePositionEmployees().length}</p>
                </div>
                <Crown className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Positions</p>
                  <p className="text-2xl font-bold">{positions.length}</p>
                </div>
                <Badge className="h-8 w-8 rounded-full flex items-center justify-center">
                  {positions.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Multi-Position Employees */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Multi-Position Employees ({getMultiPositionEmployees().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getMultiPositionEmployees().length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No employees with multiple positions found. Create some using the Add User page with multi-position enabled.
              </p>
            ) : (
              <div className="space-y-4">
                {getMultiPositionEmployees().map((employee) => (
                  <div key={employee.id} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{employee.fullname || employee.user.username}</h3>
                        <p className="text-sm text-gray-600">NIP: {employee.nip}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {employee.employee_positions.length} Positions
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {employee.employee_positions.map((assignment, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{assignment.position.name}</span>
                            <div className="flex items-center gap-1">
                              {assignment.is_primary && (
                                <Badge variant="outline" className="text-xs">
                                  <Crown className="h-2 w-2 mr-1" />
                                  Primary
                                </Badge>
                              )}
                              {getApprovalLevelBadge(assignment.position.approval_level)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>From: {assignment.effective_from}</p>
                            {assignment.effective_until && <p>Until: {assignment.effective_until}</p>}
                            <p>Status: {assignment.is_active ? 'Active' : 'Inactive'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Positions */}
        <Card>
          <CardHeader>
            <CardTitle>Available Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {positions.map((position) => (
                <div key={position.id} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{position.name}</span>
                    <div className="flex items-center gap-1">
                      {getApprovalLevelBadge(position.approval_level)}
                      {position.can_approve_overtime_org_wide && (
                        <Badge variant="outline" className="text-xs">Org</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Used by: {employees.filter(emp => 
                      emp.employee_positions?.some(pos => pos.position.id === position.id)
                    ).length} employee(s)
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button onClick={fetchData} variant="outline">
            Refresh Data
          </Button>
          <Button onClick={() => window.location.href = '/admin/add-user'}>
            Test Add User (Multi-Position)
          </Button>
          <Button onClick={() => window.location.href = '/admin/employee-positions'} variant="outline">
            Manage Employee Positions
          </Button>
        </div>
      </div>
    </div>
  );
}
