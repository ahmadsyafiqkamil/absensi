"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crown, AlertCircle, Briefcase, RefreshCw } from "lucide-react";

interface PositionContext {
  assignment_id: number | null;
  position_id: number | null;
  position_name: string;
  approval_level: number;
  can_approve_overtime_org_wide: boolean;
  is_primary: boolean;
  is_current: boolean;
}

interface PositionSwitcherDebugProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function PositionSwitcherDebug({ 
  size = 'md', 
  showLabel = true 
}: PositionSwitcherDebugProps) {
  const [contexts, setContexts] = useState<PositionContext[]>([]);
  const [currentContext, setCurrentContext] = useState<PositionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Fetch available contexts with multiple fallback methods
  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebugInfo('Starting fetch...');
        
        // Method 1: Try server-side API route first
        try {
          setDebugInfo('Trying frontend API route...');
          const response = await fetch('/api/v2/employees/employees/available_contexts/', {
            credentials: 'include',
            cache: 'no-store'
          });
          
          setDebugInfo(`Frontend API response: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              setContexts(data);
              const current = data.find((ctx: PositionContext) => ctx.is_current);
              setCurrentContext(current || null);
              setDebugInfo(`✅ Frontend API success: ${data.length} contexts`);
              return;
            }
          }
        } catch (err) {
          setDebugInfo(`Frontend API error: ${err}`);
        }
        
        // Method 2: Try getting user info first, then try direct backend
        try {
          setDebugInfo('Trying /auth/me to get user info...');
          const meResponse = await fetch('/api/v2/auth/me/', {
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (meResponse.ok) {
            const userData = await meResponse.json();
            setDebugInfo(`User data: ${userData.username}, groups: ${userData.groups?.join(',')}`);
            
            // If user has positions, create mock contexts for now
            if (userData.positions && userData.positions.length > 0) {
              const mockContexts: PositionContext[] = userData.positions.map((pos: any, index: number) => ({
                assignment_id: index + 1,
                position_id: pos.id || index + 1,
                position_name: pos.name || `Position ${index + 1}`,
                approval_level: pos.approval_level || 1,
                can_approve_overtime_org_wide: pos.can_approve_overtime_org_wide || false,
                is_primary: index === 0,
                is_current: index === 0
              }));
              
              // Add combined context
              const maxLevel = Math.max(...mockContexts.map(c => c.approval_level));
              mockContexts.push({
                assignment_id: null,
                position_id: null,
                position_name: "Combined (All Positions)",
                approval_level: maxLevel,
                can_approve_overtime_org_wide: mockContexts.some(c => c.can_approve_overtime_org_wide),
                is_primary: false,
                is_current: true
              });
              
              setContexts(mockContexts);
              setCurrentContext(mockContexts[mockContexts.length - 1]); // Combined as current
              setDebugInfo(`✅ Mock contexts created: ${mockContexts.length} contexts`);
              return;
            }
          }
        } catch (err) {
          setDebugInfo(`Auth/me error: ${err}`);
        }
        
        // Method 3: Show debug info if all methods fail
        setDebugInfo('❌ All methods failed - showing debug component');
        setContexts([]);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load contexts';
        setError(errorMessage);
        setDebugInfo(`❌ Final error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchContexts();
  }, []);

  const handleSwitchPosition = async (positionId: number | null) => {
    try {
      setSwitching(true);
      setError(null);
      
      // For now, just update local state
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
        setDebugInfo(`Switched to: ${newCurrent.position_name}`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch position';
      setError(errorMessage);
      setDebugInfo(`Switch error: ${errorMessage}`);
    } finally {
      setSwitching(false);
    }
  };

  // Always show something for debugging
  const sizeClasses = {
    sm: "w-[180px] text-xs",
    md: "w-[220px] text-sm", 
    lg: "w-[270px] text-base"
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading positions...</span>
      </div>
    );
  }

  // Show debug info and contexts (even if empty)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {showLabel && <span className="text-sm font-medium text-gray-700">Acting as:</span>}
        
        {contexts.length > 0 ? (
          <>
            <Select 
              value={currentContext?.position_id?.toString() || 'combined'} 
              onValueChange={(value) => {
                const positionId = value === 'combined' ? null : parseInt(value);
                handleSwitchPosition(positionId);
              }}
              disabled={switching}
            >
              <SelectTrigger className={sizeClasses[size]}>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      {currentContext?.position_name || 'Combined'}
                      {currentContext?.is_primary && <Crown className="h-3 w-3 text-yellow-600" />}
                    </span>
                  </SelectValue>
                </div>
              </SelectTrigger>
              
              <SelectContent>
                {contexts.map((context) => (
                  <SelectItem 
                    key={context.assignment_id || 'combined'} 
                    value={context.position_id?.toString() || 'combined'}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span>{context.position_name}</span>
                        {context.is_primary && <Crown className="h-3 w-3 text-yellow-600" />}
                      </div>
                      <Badge 
                        variant={
                          context.approval_level >= 2 ? 'default' : 
                          context.approval_level >= 1 ? 'secondary' : 'destructive'
                        } 
                        className="text-xs ml-2"
                      >
                        L{context.approval_level}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {currentContext && (
              <Badge 
                variant={
                  currentContext.approval_level >= 2 ? 'default' : 
                  currentContext.approval_level >= 1 ? 'secondary' : 'destructive'
                } 
                className="text-xs"
              >
                Level {currentContext.approval_level}
              </Badge>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No positions</span>
          </div>
        )}
        
        {switching && (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
        )}
      </div>
      
      {/* Debug info */}
      <div className="text-xs text-gray-500 max-w-md">
        {debugInfo}
      </div>
      
      {error && (
        <div className="text-xs text-red-500 max-w-md">
          Error: {error}
        </div>
      )}
    </div>
  );
}

