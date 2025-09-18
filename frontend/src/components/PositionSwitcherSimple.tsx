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
import { Crown, Users, AlertCircle, Briefcase } from "lucide-react";

interface PositionContext {
  assignment_id: number | null;
  position_id: number | null;
  position_name: string;
  approval_level: number;
  can_approve_overtime_org_wide: boolean;
  is_primary: boolean;
  is_current: boolean;
}

export default function PositionSwitcherSimple() {
  const [contexts, setContexts] = useState<PositionContext[]>([]);
  const [currentContext, setCurrentContext] = useState<PositionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token from localStorage (temporary solution for development)
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dev_access_token');
    }
    return null;
  };

  // Set token in localStorage (for development)
  const setToken = (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dev_access_token', token);
    }
  };

  // Fetch available contexts
  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        
        let token = getToken();
        
        // If no token available, component should not be visible
        if (!token) {
          console.log('No token found - user not authenticated');
          setContexts([]);
          return;
        }
        
        const response = await fetch('http://localhost:8000/api/v2/employees/employees/available_contexts/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          // Try to refresh token
          localStorage.removeItem('dev_access_token');
          throw new Error('Token expired, please refresh page');
        }
        
        const data = await response.json();
        setContexts(data);
        
        // Find current context
        const current = data.find((ctx: PositionContext) => ctx.is_current);
        setCurrentContext(current || null);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contexts');
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
      
      const token = getToken();
      if (!token) {
        throw new Error('No access token found');
      }
      
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
          
          // Show success message
          console.log(`✅ Switched to: ${newCurrent.position_name} (Level ${newCurrent.approval_level})`);
          
          // Auto-refresh page after successful position switch
          setTimeout(() => {
            window.location.reload();
          }, 500); // Small delay to show the switch happened
        }
      } else {
        throw new Error(result.error || 'Failed to switch position');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch position');
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading positions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (contexts.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Acting as:</span>
      
      <Select 
        value={currentContext?.position_id?.toString() || 'combined'} 
        onValueChange={(value) => {
          const positionId = value === 'combined' ? null : parseInt(value);
          handleSwitchPosition(positionId);
        }}
        disabled={switching}
      >
        <SelectTrigger className="w-[200px]">
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
                <Badge variant={context.approval_level >= 2 ? 'default' : context.approval_level >= 1 ? 'secondary' : 'destructive'} className="text-xs ml-2">
                  L{context.approval_level}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Current Level Badge */}
      {currentContext && (
        <Badge variant={currentContext.approval_level >= 2 ? 'default' : currentContext.approval_level >= 1 ? 'secondary' : 'destructive'} className="text-xs">
          Level {currentContext.approval_level}
        </Badge>
      )}
      
      {switching && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      )}
    </div>
  );
}
