"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Bug, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";

interface DebugInfo {
  localStorage_token?: string;
  session_user?: any;
  api_contexts?: any[];
  cookies?: string[];
}

export default function DebugPositionsPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : '🔍';
    setLogs(prev => [...prev, `${timestamp} ${emoji} ${message}`]);
  };

  const clearDebugData = () => {
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dev_access_token');
      addLog('Cleared localStorage dev_access_token', 'success');
    }
    
    // Clear cookies (by setting them to expire)
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'client_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    addLog('Cleared authentication cookies', 'success');
    
    // Refresh debug info
    fetchDebugInfo();
  };

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      addLog('Starting debug information collection...');
      
      const info: DebugInfo = {};
      
      // Check localStorage
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('dev_access_token');
        info.localStorage_token = token ? `${token.substring(0, 20)}...` : 'None';
        addLog(`localStorage token: ${info.localStorage_token}`);
      }
      
      // Check session user
      try {
        const userResponse = await fetch('/api/v2/auth/me/', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          info.session_user = {
            username: userData.username,
            employee: userData.employee?.fullname,
            positions_count: userData.positions?.length || 0
          };
          addLog(`Session user: ${userData.username} (${userData.employee?.fullname})`, 'success');
        } else {
          info.session_user = null;
          addLog(`No valid session (${userResponse.status})`, 'error');
        }
      } catch (err) {
        info.session_user = null;
        addLog(`Session check failed: ${err}`, 'error');
      }
      
      // Check available contexts
      try {
        const contextsResponse = await fetch('/api/v2/employees/employees/available_contexts/', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (contextsResponse.ok) {
          const contextsData = await contextsResponse.json();
          info.api_contexts = contextsData.map((ctx: any) => ({
            name: ctx.position_name,
            level: ctx.approval_level,
            is_primary: ctx.is_primary,
            is_current: ctx.is_current
          }));
          addLog(`Available contexts: ${contextsData.length} positions loaded`, 'success');
        } else {
          info.api_contexts = [];
          addLog(`Contexts API failed (${contextsResponse.status})`, 'error');
        }
      } catch (err) {
        info.api_contexts = [];
        addLog(`Contexts check failed: ${err}`, 'error');
      }
      
      // Check cookies
      if (typeof document !== 'undefined') {
        info.cookies = document.cookie.split(';').map(c => c.trim()).filter(c => c.includes('token') || c.includes('session'));
        addLog(`Found ${info.cookies.length} relevant cookies`);
      }
      
      setDebugInfo(info);
      addLog('Debug information collection completed', 'success');
      
    } catch (err) {
      addLog(`Debug collection error: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🐛 Position Switcher Debug</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Debug Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={fetchDebugInfo} 
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Debug Info
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={clearDebugData}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Auth Data
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/login'}
                  variant="default"
                  className="w-full"
                >
                  Go to Login Page
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Debug Information */}
          <Card>
            <CardHeader>
              <CardTitle>Current State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <strong>Session User:</strong>
                  {debugInfo.session_user ? (
                    <Badge variant="default" className="ml-2">
                      {debugInfo.session_user.username}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="ml-2">
                      Not Logged In
                    </Badge>
                  )}
                </div>
                
                <div>
                  <strong>Employee:</strong>
                  <span className="ml-2">
                    {debugInfo.session_user?.employee || 'None'}
                  </span>
                </div>
                
                <div>
                  <strong>Positions Count:</strong>
                  <Badge variant="outline" className="ml-2">
                    {debugInfo.session_user?.positions_count || 0}
                  </Badge>
                </div>
                
                <div>
                  <strong>localStorage Token:</strong>
                  <span className="ml-2 font-mono text-xs">
                    {debugInfo.localStorage_token || 'None'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Available Contexts */}
        {debugInfo.api_contexts && debugInfo.api_contexts.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Available Position Contexts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {debugInfo.api_contexts.map((context, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{context.name}</span>
                      {context.is_primary && <Badge variant="outline" className="text-xs">Primary</Badge>}
                      {context.is_current && <Badge variant="default" className="text-xs">Current</Badge>}
                    </div>
                    <div className="text-sm text-gray-600">
                      Level: {context.level}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Logs */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting Guide */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Troubleshooting Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <strong>Problem:</strong> Position switcher shows wrong positions (e.g., PPK instead of Local Staff)
                </div>
              </div>
              
              <div className="ml-6 space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs mt-0.5">1</Badge>
                  <span>Check if you're logged in as the correct user (see "Session User" above)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs mt-0.5">2</Badge>
                  <span>Clear all auth data using the button above</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs mt-0.5">3</Badge>
                  <span>Go to login page and login as the correct user</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs mt-0.5">4</Badge>
                  <span>Use incognito/private browsing mode to avoid cache issues</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs mt-0.5">5</Badge>
                  <span>Hard refresh (Ctrl+F5) after login</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

