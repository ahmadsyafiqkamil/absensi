"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, User, Crown } from "lucide-react";

interface PositionContext {
  assignment_id: number | null;
  position_id: number | null;
  position_name: string;
  approval_level: number;
  can_approve_overtime_org_wide: boolean;
  is_primary: boolean;
  is_current: boolean;
}

export default function TestPositionSwitchingPage() {
  const [contexts, setContexts] = useState<PositionContext[]>([]);
  const [currentContext, setCurrentContext] = useState<PositionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Auto-login for testing
  useEffect(() => {
    const autoLogin = async () => {
      try {
        addLog('Attempting auto-login as ppk1...');
        const loginResp = await fetch('http://localhost:8000/api/v2/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'ppk1', password: '1' })
        });
        
        if (loginResp.ok) {
          const loginData = await loginResp.json();
          setToken(loginData.access);
          addLog('✅ Auto-login successful');
          
          // Fetch contexts
          const contextsResp = await fetch('http://localhost:8000/api/v2/employees/employees/available_contexts/', {
            headers: {
              'Authorization': `Bearer ${loginData.access}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (contextsResp.ok) {
            const data = await contextsResp.json();
            setContexts(data);
            const current = data.find((ctx: PositionContext) => ctx.is_current);
            setCurrentContext(current || null);
            addLog(`✅ Loaded ${data.length} position contexts`);
          } else {
            addLog('❌ Failed to fetch contexts');
          }
        } else {
          addLog('❌ Auto-login failed');
        }
      } catch (err) {
        addLog(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    autoLogin();
  }, []);

  const handleSwitchPosition = async (positionId: number | null, positionName: string) => {
    if (!token) return;
    
    try {
      setSwitching(true);
      addLog(`🔄 Switching to: ${positionName}...`);
      
      const response = await fetch('http://localhost:8000/api/v2/employees/employees/switch_position/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position_id: positionId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to switch position');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Update current context
        const newCurrent = contexts.find(ctx => 
          positionId === null ? ctx.position_id === null : ctx.position_id === positionId
        );
        
        if (newCurrent) {
          const updatedContexts = contexts.map(ctx => ({
            ...ctx,
            is_current: ctx === newCurrent
          }));
          setContexts(updatedContexts);
          setCurrentContext(newCurrent);
          addLog(`✅ Successfully switched to: ${newCurrent.position_name} (Level ${newCurrent.approval_level})`);
        }
      } else {
        addLog(`❌ Switch failed: ${result.error}`);
      }
      
    } catch (err) {
      addLog(`❌ Switch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🧪 Position Switching Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Current Context */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentContext ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currentContext.position_name}</span>
                    {currentContext.is_primary && <Crown className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={currentContext.approval_level >= 2 ? 'default' : currentContext.approval_level >= 1 ? 'secondary' : 'destructive'}>
                      Level {currentContext.approval_level}
                    </Badge>
                    {currentContext.can_approve_overtime_org_wide && (
                      <Badge variant="outline">Org-wide</Badge>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No context selected</p>
              )}
            </CardContent>
          </Card>

          {/* Available Positions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Switch Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contexts.map((context) => (
                  <Button
                    key={context.assignment_id || 'combined'}
                    variant={context.is_current ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => handleSwitchPosition(context.position_id, context.position_name)}
                    disabled={switching || context.is_current}
                  >
                    <div className="flex items-center gap-2">
                      <span>{context.position_name}</span>
                      {context.is_primary && <Crown className="h-3 w-3 text-yellow-600" />}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      L{context.approval_level}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Logs */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
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

      </div>
    </div>
  );
}
