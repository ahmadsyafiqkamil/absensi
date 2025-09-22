import { meFromServerCookies } from '@/lib/backend';
import Header from '@/components/Header';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Settings, BarChart3 } from "lucide-react";

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function EmployeePositionsPage() {
  const me = await getMe()
  
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You are not authorized to view this page.</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  const isAdmin = me.is_superuser || (me.groups || []).includes('admin')
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">Admin privileges required.</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header 
        title="Employee Position Management" 
        subtitle="Manage multiple positions for employees"
        username={me.username}
        role="admin"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Assign Single Position */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="w-5 h-5" />
                Assign Position
              </CardTitle>
              <CardDescription>Assign a position to an employee</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/employee-positions/assign">
                <Button className="w-full">
                  Single Assignment
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Bulk Assignment */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5" />
                Bulk Assignment
              </CardTitle>
              <CardDescription>Assign position to multiple employees</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/employee-positions/bulk-assign">
                <Button variant="outline" className="w-full">
                  Bulk Assignment
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Position Analytics */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5" />
                Analytics
              </CardTitle>
              <CardDescription>View position assignment analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/employee-positions/analytics">
                <Button variant="outline" className="w-full">
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-5 h-5" />
                Settings
              </CardTitle>
              <CardDescription>Configure position management settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/employee-positions/settings">
                <Button variant="outline" className="w-full">
                  Settings
                </Button>
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* Current Assignments Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Current Position Assignments
            </CardTitle>
            <CardDescription>
              Overview of all employee position assignments in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Position assignments table will be loaded here</p>
              <p className="text-sm mt-2">This will show all employee-position relationships with management actions</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Total Assignments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Active Assignments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600">Multi-Position Employees</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">0</div>
              <div className="text-sm text-gray-600">Pending Assignments</div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
