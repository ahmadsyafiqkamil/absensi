"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, RefreshCw } from "lucide-react";
import PositionSwitcherFromAuthMe from "@/components/PositionSwitcherFromAuthMe";

export default function TestPositionSwitcherPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const loginAsKonsuler1 = async () => {
    try {
      const response = await fetch('/api/v2/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: 'konsuler1', password: '1' })
      });
      
      if (response.ok) {
        alert('Login successful! Refreshing components...');
        setRefreshKey(prev => prev + 1);
        // Small delay to allow login to process
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const errorData = await response.json();
        alert(`Login failed: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      alert(`Login error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🎯 Position Switcher Test (From /auth/me)</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Position Switcher Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Live Position Switcher
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center min-h-[60px]">
                  <PositionSwitcherFromAuthMe key={refreshKey} />
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>• Jika tidak ada switcher: User belum login atau hanya 1 posisi</p>
                  <p>• Jika ada dropdown: User punya multiple positions</p>
                  <p>• Data diambil langsung dari <code className="bg-gray-100 px-1 rounded">/auth/me</code></p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Test Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button onClick={loginAsKonsuler1} className="w-full">
                  Login as konsuler1 (Multi-Position User)
                </Button>
                
                <Button 
                  onClick={() => setRefreshKey(prev => prev + 1)} 
                  variant="outline" 
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Component
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/clear-session'} 
                  variant="destructive" 
                  className="w-full"
                >
                  Clear Session & Test Again
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/test-auth'} 
                  variant="secondary" 
                  className="w-full"
                >
                  Go to Full Auth Test
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Benefits */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>✅ Benefits of New Approach</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Badge variant="default" className="mb-2">Performance</Badge>
                <ul className="text-sm space-y-1">
                  <li>• <strong>1 API call</strong> instead of 2</li>
                  <li>• Uses existing <code>/auth/me</code> data</li>
                  <li>• No separate <code>/available_contexts</code> call</li>
                  <li>• Faster loading & less network traffic</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Badge variant="secondary" className="mb-2">Reliability</Badge>
                <ul className="text-sm space-y-1">
                  <li>• <strong>No authentication issues</strong></li>
                  <li>• Same auth context as user data</li>
                  <li>• Consistent session handling</li>
                  <li>• Automatic data synchronization</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Badge variant="outline" className="mb-2">Simplicity</Badge>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Single data source</strong></li>
                  <li>• No API proxy complexity</li>
                  <li>• Unified error handling</li>
                  <li>• Easier to maintain</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Badge variant="destructive" className="mb-2">Dynamic</Badge>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Real-time updates</strong></li>
                  <li>• Always in sync with user state</li>
                  <li>• No stale data issues</li>
                  <li>• Automatic refresh on login</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🔧 Technical Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <Badge variant="outline" className="mb-2">Backend Changes</Badge>
                <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                  <p># drf/app/apps/authentication/views.py</p>
                  <p>def me(request):</p>
                  <p>&nbsp;&nbsp;# ... existing user data ...</p>
                  <p>&nbsp;&nbsp;user_data['available_contexts'] = employee.get_available_position_contexts()</p>
                </div>
              </div>
              
              <div>
                <Badge variant="outline" className="mb-2">Frontend Changes</Badge>
                <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                  <p># PositionSwitcherFromAuthMe.tsx</p>
                  <p>const response = await fetch('/api/v2/auth/me')</p>
                  <p>const data = await response.json()</p>
                  <p>setContexts(data.available_contexts)</p>
                </div>
              </div>
              
              <div>
                <Badge variant="outline" className="mb-2">Data Flow</Badge>
                <div className="bg-gray-50 p-3 rounded text-xs">
                  <p>1. Component calls <code>/auth/me</code></p>
                  <p>2. Backend returns user data + available_contexts</p>
                  <p>3. Component renders switcher with contexts</p>
                  <p>4. Switch position calls <code>/switch_position</code></p>
                  <p>5. Page refreshes to update all components</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
