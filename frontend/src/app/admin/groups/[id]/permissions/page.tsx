import { meFromServerCookies } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Header from '@/components/Header';
import GroupPermissionsManager from './GroupPermissionsManager';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function GroupPermissionsPage({ params }: PageProps) {
  const me = await getMe()
  const resolvedParams = await params
  
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
        title="Manage Group Permissions" 
        subtitle="Configure permissions for this group"
        username={me.username}
        role={me.groups?.includes('admin') ? 'admin' : 'superuser'}
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Group Permissions</h1>
            <p className="text-gray-600 mt-1">Manage what users in this group can do</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/admin/groups/${resolvedParams.id}`}>
              <Button variant="outline">
                ← Back to Group
              </Button>
            </Link>
            <Link href="/admin/groups">
              <Button variant="outline">
                All Groups
              </Button>
            </Link>
          </div>
        </div>

        {/* Permissions Manager Component */}
        <GroupPermissionsManager groupId={parseInt(resolvedParams.id)} />
      </div>
    </div>
  );
}

