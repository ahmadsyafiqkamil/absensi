"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, AlertTriangle, User } from "lucide-react";

export default function TestAuthPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cookies, setCookies] = useState<string[]>([]);

  const runAuthTests = async () => {
    setLoading(true);
    const results: any[] = [];

    // Check cookies
    if (typeof document !== 'undefined') {
      const allCookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);
      setCookies(allCookies);
    }

    try {
      // Test 1: /auth/me
      const test1Start = performance.now();
      const meResponse = await fetch('/api/v2/auth/me/', {
        credentials: 'include',
        cache: 'no-store'
      });
      const test1End = performance.now();
      
      let meData = null;
      try {
        meData = await meResponse.json();
      } catch (e) {
        meData = { error: 'Invalid JSON response' };
      }
      
      results.push({
        name: '/api/v2/auth/me',
        status: meResponse.status,
        time: `${Math.round(test1End - test1Start)}ms`,
        success: meResponse.ok,
        data: meData,
        headers: Object.fromEntries(meResponse.headers.entries())
      });

      // Test 2: available_contexts
      const test2Start = performance.now();
      const contextsResponse = await fetch('/api/v2/employees/employees/available_contexts/', {
        credentials: 'include',
        cache: 'no-store'
      });
      const test2End = performance.now();
      
      let contextsData = null;
      try {
        contextsData = await contextsResponse.json();
      } catch (e) {
        contextsData = { error: 'Invalid JSON response' };
      }
      
      results.push({
        name: '/api/v2/employees/employees/available_contexts',
        status: contextsResponse.status,
        time: `${Math.round(test2End - test2Start)}ms`,
        success: contextsResponse.ok,
        data: contextsData,
        headers: Object.fromEntries(contextsResponse.headers.entries())
      });

      // Test 3: Direct backend test (if we can get token)
      if (meData && meData.access_token) {
        const test3Start = performance.now();
        const directResponse = await fetch('http://localhost:8000/api/v2/employees/employees/available_contexts/', {
          headers: {
            'Authorization': `Bearer ${meData.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const test3End = performance.now();
        
        let directData = null;
        try {
          directData = await directResponse.json();
        } catch (e) {
          directData = { error: 'Invalid JSON response' };
        }
        
        results.push({
          name: 'Direct Backend API',
          status: directResponse.status,
          time: `${Math.round(test3End - test3Start)}ms`,
          success: directResponse.ok,
          data: directData,
          headers: Object.fromEntries(directResponse.headers.entries())
        });
      }

    } catch (error) {
      results.push({
        name: 'Test Error',
        status: 'ERROR',
        time: '0ms',
        success: false,
        data: { error: String(error) },
        headers: {}
      });
    }

    setTests(results);
    setLoading(false);
  };

  useEffect(() => {
    runAuthTests();
  }, []);

  const loginAsKonsuler1 = async () => {
    try {
      const response = await fetch('/api/v2/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: 'konsuler1', password: '1' })
      });
      
      if (response.ok) {
        alert('Login successful! Refreshing tests...');
        runAuthTests();
        // Refresh page to update header
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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔐 Authentication Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button onClick={loginAsKonsuler1} className="w-full">
                  Login as konsuler1
                </Button>
                
                <Button onClick={runAuthTests} variant="outline" className="w-full" disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Refresh Tests
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/clear-session'} 
                  variant="destructive" 
                  className="w-full"
                >
                  Clear Session & Cookies
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Cookies */}
          <Card>
            <CardHeader>
              <CardTitle>Browser Cookies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cookies.length === 0 ? (
                  <p className="text-gray-500 text-sm">No cookies found</p>
                ) : (
                  cookies.map((cookie, index) => (
                    <div key={index} className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
                      {cookie}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* API Test Results */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              API Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">{test.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={test.success ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {test.status}
                      </Badge>
                      <span className="text-xs text-gray-500">{test.time}</span>
                    </div>
                  </div>
                  
                  {test.data && (
                    <div className="text-xs font-mono bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                      <pre>{JSON.stringify(test.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">1</Badge>
                <span>Jika semua tests return 401: Click "Login as konsuler1"</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">2</Badge>
                <span>Jika login berhasil: Tests akan refresh dan return 200</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">3</Badge>
                <span>Jika masih 401: Click "Clear Session & Cookies" dulu</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">4</Badge>
                <span>Cek "Browser Cookies" untuk memastikan ada access_token</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

