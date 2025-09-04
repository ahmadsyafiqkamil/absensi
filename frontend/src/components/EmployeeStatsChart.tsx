import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  Crown,
  Calendar
} from 'lucide-react';

interface EmployeeStatsChartProps {
  stats: {
    total_employees: number;
    active_employees: number;
    inactive_employees: number;
    employees_by_division: Record<string, number>;
    employees_by_role: Record<string, number>;
    recent_hires: number;
    upcoming_birthdays: number;
  };
}

export default function EmployeeStatsChart({ stats }: EmployeeStatsChartProps) {
  const activePercentage = stats.total_employees > 0
    ? Math.round((stats.active_employees / stats.total_employees) * 100)
    : 0;

  const inactivePercentage = 100 - activePercentage;

  // Sort divisions by employee count
  const sortedDivisions = Object.entries(stats.employees_by_division)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5); // Top 5 divisions

  // Sort roles by employee count
  const sortedRoles = Object.entries(stats.employees_by_role)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5); // Top 5 roles

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Employee Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Employee Status Overview
          </CardTitle>
          <CardDescription>
            Current status of all employees in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Employees</span>
              <span className="text-sm text-gray-600">
                {stats.active_employees} / {stats.total_employees}
              </span>
            </div>
            <Progress value={activePercentage} className="h-2" />
            <div className="text-xs text-gray-500">{activePercentage}% active</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Inactive Employees</span>
              <span className="text-sm text-gray-600">{stats.inactive_employees}</span>
            </div>
            <Progress value={inactivePercentage} className="h-2" />
            <div className="text-xs text-gray-500">{inactivePercentage}% inactive</div>
          </div>

          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.recent_hires}</div>
                <div className="text-xs text-gray-600">Recent Hires</div>
                <div className="text-xs text-gray-500">(Last 30 days)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.upcoming_birthdays}</div>
                <div className="text-xs text-gray-600">Upcoming Birthdays</div>
                <div className="text-xs text-gray-500">(Next 30 days)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Division Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Top Divisions by Employee Count
          </CardTitle>
          <CardDescription>
            Employee distribution across different divisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedDivisions.map(([division, count], index) => {
              const percentage = stats.total_employees > 0
                ? Math.round((count / stats.total_employees) * 100)
                : 0;

              return (
                <div key={division} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{division}</div>
                      <div className="text-xs text-gray-500">{count} employees</div>
                    </div>
                  </div>
                  <Badge variant="outline">{percentage}%</Badge>
                </div>
              );
            })}
          </div>

          {sortedDivisions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No division data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Distribution */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Role Distribution
          </CardTitle>
          <CardDescription>
            Most common roles in the organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRoles.map(([role, count], index) => {
              const percentage = stats.total_employees > 0
                ? Math.round((count / stats.total_employees) * 100)
                : 0;

              return (
                <div key={role} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-xs text-gray-500">{percentage}%</span>
                  </div>
                  <div className="font-medium text-sm mb-1">{role}</div>
                  <div className="text-2xl font-bold text-blue-600">{count}</div>
                  <div className="text-xs text-gray-500">employees</div>
                </div>
              );
            })}
          </div>

          {sortedRoles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No role data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Quick Statistics Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.total_employees}</div>
              <div className="text-sm text-gray-600">Total Employees</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.active_employees} active
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Object.keys(stats.employees_by_division).length}
              </div>
              <div className="text-sm text-gray-600">Divisions</div>
              <div className="text-xs text-gray-500 mt-1">
                Active departments
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Object.keys(stats.employees_by_role).length}
              </div>
              <div className="text-sm text-gray-600">Role Types</div>
              <div className="text-xs text-gray-500 mt-1">
                Different positions
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {stats.recent_hires + stats.upcoming_birthdays}
              </div>
              <div className="text-sm text-gray-600">Recent Activity</div>
              <div className="text-xs text-gray-500 mt-1">
                Hires + Birthdays
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
