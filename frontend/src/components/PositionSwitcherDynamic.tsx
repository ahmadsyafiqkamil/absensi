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
import { Crown, Users, AlertCircle, Briefcase, RefreshCw } from "lucide-react";

interface PositionContext {
  assignment_id: number | null;
  position_id: number | null;
  position_name: string;
  approval_level: number;
  can_approve_overtime_org_wide: boolean;
  is_primary: boolean;
  is_current: boolean;
}

interface PositionSwitcherDynamicProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function PositionSwitcherDynamic({ 
  size = 'md', 
  showLabel = true 
}: PositionSwitcherDynamicProps) {
  const [contexts, setContexts] = useState<PositionContext[]>([]);
  const [currentContext, setCurrentContext] = useState<PositionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available contexts using server-side API route
  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use frontend API route that handles server-side authentication
        const response = await fetch('/api/v2/employees/employees/available_contexts/', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated - hide component
            console.log('🔒 Position Switcher: User not authenticated (401), component hidden');
            setContexts([]);
            return;
          }
          throw new Error(`Failed to fetch contexts: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validate response data
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }
        
        setContexts(data);
        
        // Find current context
        const current = data.find((ctx: PositionContext) => ctx.is_current);
        setCurrentContext(current || null);
        
        console.log('🎯 POSITION SWITCHER DEBUG:', {
          component: 'PositionSwitcherDynamic',
          total_contexts: data.length,
          current_context: current?.position_name || 'None',
          all_contexts: data.map(ctx => ({
            name: ctx.position_name,
            level: ctx.approval_level,
            is_current: ctx.is_current,
            is_primary: ctx.is_primary,
            position_id: ctx.position_id
          }))
        });
        
        // Additional debug info
        console.log('🔍 RAW API RESPONSE:', data);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load contexts';
        console.error('Position switcher error:', errorMessage);
        setError(errorMessage);
        setContexts([]);
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
      
      console.log('Switching to position:', positionId);
      
      // Use frontend API route that handles server-side authentication
      const response = await fetch('/api/v2/employees/employees/switch_position/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ position_id: positionId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to switch position: ${response.status}`);
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
          
          console.log(`✅ Switched to: ${newCurrent.position_name} (Level ${newCurrent.approval_level})`);
          
          // Auto-refresh page after successful position switch
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } else {
        throw new Error(result.error || 'Failed to switch position');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch position';
      console.error('Position switch error:', errorMessage);
      setError(errorMessage);
    } finally {
      setSwitching(false);
    }
  };

  // Don't render if loading initially
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading positions...</span>
      </div>
    );
  }

  // Don't render if error or no contexts
  if (error || contexts.length === 0) {
    // Only show error if it's not authentication related
    if (error && !error.includes('401') && !error.includes('authentication')) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      );
    }
    return null; // Hide component if user not authenticated or no positions
  }

  const sizeClasses = {
    sm: "w-[150px] text-xs",
    md: "w-[200px] text-sm", 
    lg: "w-[250px] text-base"
  };

  return (
    <div className="flex items-center gap-2">
      {showLabel && <span className="text-sm font-medium text-gray-700">Acting as:</span>}
      
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
      
      {/* Current Level Badge */}
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
      
      {switching && (
        <div className="flex items-center gap-1">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-xs text-gray-500">Switching...</span>
        </div>
      )}
    </div>
  );
}
