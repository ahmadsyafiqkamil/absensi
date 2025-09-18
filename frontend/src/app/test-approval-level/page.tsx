"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { useSupervisorApprovalLevel } from '@/lib/hooks';

export default function TestApprovalLevelPage() {
  const [token, setToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Use the updated hook that should reflect real-time changes
  const { approvalLevel, canApprove, loading, approvalSource, multiPositionInfo } = useSupervisorApprovalLevel();

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
          localStorage.setItem('dev_access_token', loginData.access);
          addLog('✅ Auto-login successful');
        } else {
          addLog('❌ Auto-login failed');
        }
      } catch (err) {
        addLog(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    autoLogin();
  }, []);

  const handleSwitchPosition = async (positionId: number | null, positionName: string) => {
    if (!token) return;
    
    try {
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
        addLog(`✅ Successfully switched to: ${positionName}`);
        // Force a small delay to allow hooks to update
        setTimeout(() => {
          addLog(`📊 Approval level should now reflect: ${positionName}`);
        }, 1000);
      } else {
        addLog(`❌ Switch failed: ${result.error}`);
      }
      
    } catch (err) {
      addLog(`❌ Switch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getApprovalLevelColor = (level: number | null) => {
    if (level === null) return 'gray';
    if (level === 0) return 'red';
    if (level === 1) return 'green';
    if (level >= 2) return 'blue';
    return 'gray';
  };

  const getApprovalLevelIcon = (level: number | null) => {
    if (level === null || level === 0) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🧪 Real-Time Approval Level Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Current Approval Level */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getApprovalLevelIcon(approvalLevel)}
                Current Approval Level
                {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getApprovalLevelColor(approvalLevel) === 'blue' ? 'default' : 
                           getApprovalLevelColor(approvalLevel) === 'green' ? 'secondary' : 'destructive'}
                    className="text-lg px-3 py-1"
                  >
                    Level {approvalLevel ?? 'Unknown'}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {canApprove ? 'Can Approve' : 'Cannot Approve'}
                  </span>
                </div>
                
                {approvalSource && (
                  <div className="text-sm text-gray-600">
                    <strong>Source:</strong> {approvalSource}
                  </div>
                )}
                
                {multiPositionInfo && (
                  <div className="text-sm text-gray-600">
                    <strong>Positions:</strong> {multiPositionInfo.total_positions || 0} total
                    {multiPositionInfo.primary_position && (
                      <div><strong>Primary:</strong> {multiPositionInfo.primary_position.name}</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Position Switching Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Switch Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => handleSwitchPosition(1, 'Home Staff (Level 1)')}
                  disabled={!token}
                >
                  <span>Home Staff</span>
                  <Badge variant="outline" className="text-xs">L1</Badge>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => handleSwitchPosition(4, 'PPK (Level 2)')}
                  disabled={!token}
                >
                  <span>PPK</span>
                  <Badge variant="outline" className="text-xs">L2</Badge>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => handleSwitchPosition(null, 'Combined (Max Level)')}
                  disabled={!token}
                >
                  <span>Combined</span>
                  <Badge variant="outline" className="text-xs">Max</Badge>
                </Button>
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
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expected Behavior */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Expected Behavior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Home Staff Switch:</strong> Should show Level 1 (Can Approve division-level)</p>
              <p><strong>PPK Switch:</strong> Should show Level 2 (Can Approve org-wide)</p>
              <p><strong>Combined Mode:</strong> Should show max Level 2 (All capabilities)</p>
              <p><strong>Real-time:</strong> Approval level badge should update immediately after switching</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
