"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, LogOut, AlertTriangle, CheckCircle } from "lucide-react";

export default function ClearSessionPage() {
  const [clearing, setClearing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : '🔍';
    setLogs(prev => [...prev, `${timestamp} ${emoji} ${message}`]);
  };

  const clearAllSessionData = async () => {
    setClearing(true);
    addLog('Starting session cleanup...');

    try {
      // Clear localStorage
      if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('token') || key.includes('auth') || key.includes('user'))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          addLog(`Removed localStorage: ${key}`, 'success');
        });
        
        if (keysToRemove.length === 0) {
          addLog('No localStorage items to clear');
        }
      }

      // Clear cookies
      const cookiesToClear = [
        'access_token', 
        'refresh_token', 
        'client_access_token',
        'sessionid',
        'csrftoken'
      ];
      
      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        addLog(`Cleared cookie: ${cookieName}`, 'success');
      });

      // Clear sessionStorage
      if (typeof window !== 'undefined') {
        const sessionKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            sessionKeys.push(key);
          }
        }
        
        sessionKeys.forEach(key => {
          sessionStorage.removeItem(key);
          addLog(`Removed sessionStorage: ${key}`, 'success');
        });
        
        if (sessionKeys.length === 0) {
          addLog('No sessionStorage items to clear');
        }
      }

      // Try to logout via API
      try {
        const logoutResponse = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        
        if (logoutResponse.ok) {
          addLog('API logout successful', 'success');
        } else {
          addLog(`API logout returned: ${logoutResponse.status}`, 'info');
        }
      } catch (err) {
        addLog('API logout not available', 'info');
      }

      addLog('Session cleanup completed!', 'success');
      addLog('You can now login fresh as konsuler1', 'success');

    } catch (error) {
      addLog(`Error during cleanup: ${error}`, 'error');
    } finally {
      setClearing(false);
    }
  };

  const testCurrentSession = async () => {
    addLog('Testing current session...');
    
    try {
      const meResponse = await fetch('/api/v2/auth/me/', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (meResponse.ok) {
        const userData = await meResponse.json();
        addLog(`Current user: ${userData.username}`, 'success');
        addLog(`Groups: ${userData.groups?.join(', ') || 'None'}`, 'info');
        addLog(`Positions: ${userData.positions?.length || 0}`, 'info');
      } else {
        addLog(`No valid session (${meResponse.status})`, 'info');
      }
    } catch (error) {
      addLog(`Session test error: ${error}`, 'error');
    }
  };

  const forceRefreshPage = () => {
    addLog('Force refreshing page...', 'info');
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🧹 Clear Session & Cache</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Session Cleanup Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={clearAllSessionData}
                  disabled={clearing}
                  variant="destructive"
                  className="w-full"
                >
                  {clearing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Session Data
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={testCurrentSession}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Test Current Session
                </Button>
                
                <Button 
                  onClick={forceRefreshPage}
                  variant="default"
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Go to Login Page
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Problem Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Data Inconsistency Issue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <strong className="text-red-800">Problem:</strong>
                  <p className="text-red-700 mt-1">
                    Position switcher menampilkan PPK + Home Staff, 
                    tapi database konsuler1 seharusnya Home Staff + Pengelola Keuangan
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <strong className="text-blue-800">Expected Data:</strong>
                  <ul className="text-blue-700 mt-1 list-disc list-inside">
                    <li>Home Staff (Level 1, Primary)</li>
                    <li>Pengelola Keuangan (Level 1)</li>
                    <li>Combined (Level 1)</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <strong className="text-green-800">Solution:</strong>
                  <p className="text-green-700 mt-1">
                    Clear semua session data dan login fresh sebagai konsuler1 
                    untuk mendapatkan data yang benar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Activity Logs */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-sm">No activity yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
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
            <CardTitle>Step-by-Step Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">1</Badge>
                <span>Click "Clear All Session Data" untuk membersihkan cache</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">2</Badge>
                <span>Click "Go to Login Page" untuk ke halaman login</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">3</Badge>
                <span>Login sebagai: <strong>konsuler1</strong> / password: <strong>1</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">4</Badge>
                <span>Position switcher sekarang akan menampilkan data yang benar</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">5</Badge>
                <span>Cek browser console untuk debug info: "🎯 Position Switcher Data"</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}




