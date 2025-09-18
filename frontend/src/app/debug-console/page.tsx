"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Bug, Eye, AlertTriangle } from "lucide-react";
import PositionSwitcherDebug from '@/components/PositionSwitcherDebug';

export default function DebugConsolePage() {
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [apiTests, setApiTests] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Capture console logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const captureLog = (level: string, ...args: any[]) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setConsoleLogs(prev => [...prev.slice(-20), `${timestamp} [${level}] ${message}`]);
    };

    console.log = (...args) => {
      originalLog(...args);
      captureLog('LOG', ...args);
    };

    console.error = (...args) => {
      originalError(...args);
      captureLog('ERROR', ...args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      captureLog('WARN', ...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const runAPITests = async () => {
    setLoading(true);
    const tests: any[] = [];

    try {
      // Test 1: /auth/me
      const test1Start = performance.now();
      const meResponse = await fetch('/api/v2/auth/me/', {
        credentials: 'include',
        cache: 'no-store'
      });
      const test1End = performance.now();
      
      const meData = meResponse.ok ? await meResponse.json() : null;
      tests.push({
        name: '/api/v2/auth/me',
        status: meResponse.status,
        time: `${Math.round(test1End - test1Start)}ms`,
        success: meResponse.ok,
        data: meData ? {
          username: meData.username,
          groups: meData.groups,
          positions: meData.positions?.length || 0
        } : null
      });

      if (meData) {
        setUserInfo(meData);
      }

      // Test 2: available_contexts
      const test2Start = performance.now();
      const contextsResponse = await fetch('/api/v2/employees/employees/available_contexts/', {
        credentials: 'include',
        cache: 'no-store'
      });
      const test2End = performance.now();
      
      const contextsData = contextsResponse.ok ? await contextsResponse.json() : null;
      tests.push({
        name: '/api/v2/employees/employees/available_contexts',
        status: contextsResponse.status,
        time: `${Math.round(test2End - test2Start)}ms`,
        success: contextsResponse.ok,
        data: contextsData ? {
          count: contextsData.length,
          positions: contextsData.map((c: any) => c.position_name)
        } : null
      });

      // Test 3: current_context
      const test3Start = performance.now();
      const currentResponse = await fetch('/api/v2/employees/employees/current_context/', {
        credentials: 'include',
        cache: 'no-store'
      });
      const test3End = performance.now();
      
      const currentData = currentResponse.ok ? await currentResponse.json() : null;
      tests.push({
        name: '/api/v2/employees/employees/current_context',
        status: currentResponse.status,
        time: `${Math.round(test3End - test3Start)}ms`,
        success: currentResponse.ok,
        data: currentData ? {
          context: currentData.context,
          level: currentData.approval_level,
          position: currentData.active_position?.name
        } : null
      });

    } catch (error) {
      tests.push({
        name: 'API Tests',
        status: 'ERROR',
        time: '0ms',
        success: false,
        data: { error: String(error) }
      });
    }

    setApiTests(tests);
    setLoading(false);
  };

  useEffect(() => {
    runAPITests();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🐛 Browser Console Debug</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Position Switcher Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Position Switcher Live Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-3">Position Switcher Component:</p>
                  <PositionSwitcherDebug size="md" showLabel={true} />
                </div>
                
                {userInfo && (
                  <div className="text-sm text-gray-600">
                    <p><strong>Current User:</strong> {userInfo.username}</p>
                    <p><strong>Groups:</strong> {userInfo.groups?.join(', ') || 'None'}</p>
                    <p><strong>Positions:</strong> {userInfo.positions?.length || 0}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                API Status Tests
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={runAPITests}
                  disabled={loading}
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Refresh'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {apiTests.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{test.name}</div>
                      {test.data && (
                        <div className="text-xs text-gray-600 mt-1">
                          {JSON.stringify(test.data)}
                        </div>
                      )}
                    </div>
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
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Console Logs */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Live Console Logs
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setConsoleLogs([])}
              >
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {consoleLogs.length === 0 ? (
                <div className="text-gray-500 text-sm">No logs captured yet...</div>
              ) : (
                consoleLogs.map((log, index) => (
                  <div key={index} className="text-xs font-mono bg-gray-50 p-2 rounded">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">1</Badge>
                <span>Position Switcher di atas akan menampilkan debug info real-time</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">2</Badge>
                <span>API Status Tests menunjukkan response dari setiap endpoint</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">3</Badge>
                <span>Console Logs menampilkan semua console.log, console.error, console.warn</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">4</Badge>
                <span>Jika Position Switcher tidak muncul di header, lihat error messages di sini</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

