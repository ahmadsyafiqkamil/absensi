import { meFromServerCookies } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Header from '@/components/Header';
import AddGroupForm from './AddGroupForm';

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function AddGroupPage() {
  const me = await getMe()
  
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  const groups: string[] = me?.groups || []
  const isAdmin = groups.includes('admin') || me?.is_superuser

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Add New Group" 
        subtitle="Create a new user group"
        username={me.username}
        role={me.groups?.includes('admin') ? 'admin' : 'superuser'}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Group</h1>
            <p className="text-gray-600 mt-1">Create a new user group with specific permissions</p>
          </div>
          <Link href="/admin/groups">
            <Button variant="outline">
              ← Back to Groups
            </Button>
          </Link>
        </div>

        {/* Add Group Form */}
        <Card>
          <CardHeader>
            <CardTitle>Group Information</CardTitle>
            <CardDescription>Fill in the details for the new group</CardDescription>
          </CardHeader>
          <CardContent>
            <AddGroupForm />
          </CardContent>
        </Card>

        {/* Help Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Group Management Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Group names should be descriptive and follow a consistent naming convention (e.g., "admin", "supervisor", "pegawai")</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Permissions determine what actions users in this group can perform within the system</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Users can be assigned to multiple groups, inheriting permissions from all assigned groups</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Consider creating groups based on job functions rather than individual names</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
