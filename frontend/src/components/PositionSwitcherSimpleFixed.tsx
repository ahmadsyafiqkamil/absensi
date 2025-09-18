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
import { Crown, Briefcase } from "lucide-react";

interface PositionContext {
  assignment_id: number | null;
  position_id: number | null;
  position_name: string;
  approval_level: number;
  can_approve_overtime_org_wide: boolean;
  is_primary: boolean;
  is_current: boolean;
}

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function PositionSwitcherSimpleFixed({ 
  size = 'md', 
  showLabel = true 
}: Props) {
  const [contexts, setContexts] = useState<PositionContext[]>([]);
  const [currentContext, setCurrentContext] = useState<PositionContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        
        // Add cache busting and debug info
        const timestamp = Date.now();
        const response = await fetch(`/api/v2/employees/employees/available_contexts?_=${timestamp}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🎯 Position Switcher Data:', {
            timestamp: new Date().toISOString(),
            contexts_count: data.length,
            positions: data.map(ctx => ({
              name: ctx.position_name,
              id: ctx.position_id,
              assignment_id: ctx.assignment_id,
              level: ctx.approval_level,
              is_current: ctx.is_current,
              is_primary: ctx.is_primary
            }))
          });
          
          if (Array.isArray(data) && data.length > 0) {
            setContexts(data);
            const current = data.find(ctx => ctx.is_current);
            setCurrentContext(current || data[0]);
          }
        } else if (response.status === 401) {
          console.log('🔒 Position Switcher: User not authenticated, component will be hidden');
          // Don't show error for 401 - just hide component
          setContexts([]);
        } else {
          console.error('Position switcher API error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Position switcher error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContexts();
  }, []);

  const handleSwitchPosition = async (positionId: number | null) => {
    try {
      const response = await fetch('/api/v2/employees/employees/switch_position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ position_id: positionId })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update local state
          const newCurrent = contexts.find(ctx => 
            positionId === null ? ctx.position_id === null : ctx.position_id === positionId
          );
          if (newCurrent) {
            setContexts(contexts.map(ctx => ({
              ...ctx,
              is_current: ctx === newCurrent
            })));
            setCurrentContext(newCurrent);
            
            // Refresh page after successful switch
            setTimeout(() => window.location.reload(), 500);
          }
        }
      }
    } catch (error) {
      console.error('Switch error:', error);
    }
  };

  const sizeClasses = {
    sm: "w-[180px] text-xs",
    md: "w-[200px] text-sm", 
    lg: "w-[220px] text-base"
  };

  // Don't render anything if loading initially
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  // Don't render anything if no contexts (user not authenticated or no positions)
  if (contexts.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {showLabel && <span className="text-sm font-medium text-gray-700">Acting as:</span>}
      
      <Select 
        value={currentContext?.position_id?.toString() || 'combined'} 
        onValueChange={(value) => {
          const positionId = value === 'combined' ? null : parseInt(value);
          handleSwitchPosition(positionId);
        }}
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
          {contexts.map((context, index) => (
            <SelectItem 
              key={index} 
              value={context.position_id?.toString() || 'combined'}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span>{context.position_name}</span>
                  {context.is_primary && <Crown className="h-3 w-3 text-yellow-600" />}
                </div>
                <Badge 
                  variant={context.approval_level >= 2 ? 'default' : context.approval_level >= 1 ? 'secondary' : 'destructive'} 
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
          variant={currentContext.approval_level >= 2 ? 'default' : currentContext.approval_level >= 1 ? 'secondary' : 'destructive'} 
          className="text-xs"
        >
          Level {currentContext.approval_level}
        </Badge>
      )}
    </div>
  );
}
