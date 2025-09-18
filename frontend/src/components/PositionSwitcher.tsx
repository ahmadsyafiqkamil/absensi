"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Crown, 
  Users, 
  ChevronDown, 
  CheckCircle, 
  AlertCircle,
  Briefcase,
  Shield
} from "lucide-react";

interface PositionContext {
  assignment_id: number | null;
  position_id: number | null;
  position_name: string;
  approval_level: number;
  can_approve_overtime_org_wide: boolean;
  is_primary: boolean;
  is_current: boolean;
  effective_from: string | null;
  effective_until: string | null;
}

interface PositionSwitcherProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onPositionChange?: (context: PositionContext) => void;
}

export default function PositionSwitcher({ 
  size = 'md', 
  showLabel = true,
  onPositionChange 
}: PositionSwitcherProps) {
  const [contexts, setContexts] = useState<PositionContext[]>([]);
  const [currentContext, setCurrentContext] = useState<PositionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available contexts
  useEffect(() => {
    const fetchContexts = async () => {
      try {
        setLoading(true);
        
        // Use frontend API route (handles server-side authentication)
        const response = await fetch('/api/v2/employees/employees/available_contexts/', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch available contexts');
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
      
      // Use frontend API route (handles server-side authentication)
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
        throw new Error('Failed to switch position');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Update current context
        const newCurrent = contexts.find(ctx => 
          positionId === null ? ctx.position_id === null : ctx.position_id === positionId
        );
        
        if (newCurrent) {
          // Update contexts to reflect new current
          const updatedContexts = contexts.map(ctx => ({
            ...ctx,
            is_current: ctx === newCurrent
          }));
          setContexts(updatedContexts);
          setCurrentContext(newCurrent);
          
          // Notify parent component
          if (onPositionChange) {
            onPositionChange(newCurrent);
          }
          
          // Refresh page to update all components with new context
          window.location.reload();
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

  const getApprovalLevelBadge = (level: number, orgWide: boolean) => {
    const variant = level >= 2 ? 'default' : level >= 1 ? 'secondary' : 'destructive';
    return (
      <div className="flex items-center gap-1">
        <Badge variant={variant} className="text-xs">
          Level {level}
        </Badge>
        {orgWide && (
          <Badge variant="outline" className="text-xs">
            Org-wide
          </Badge>
        )}
      </div>
    );
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

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className={`font-medium text-gray-700 ${sizeClasses[size]}`}>
          Acting as:
        </span>
      )}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size={size}
            className="justify-between min-w-[200px]"
            disabled={switching}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="truncate">
                {currentContext?.position_name || 'Select Position'}
              </span>
              {currentContext?.is_primary && (
                <Crown className="h-3 w-3 text-yellow-600" />
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Switch Position Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contexts.map((context) => (
                <div
                  key={context.assignment_id || 'combined'}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    context.is_current
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSwitchPosition(context.position_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {context.position_name}
                        </span>
                        {context.is_primary && (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        )}
                        {context.is_current && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getApprovalLevelBadge(context.approval_level, context.can_approve_overtime_org_wide)}
                      </div>
                      
                      {context.effective_from && (
                        <div className="text-xs text-gray-500">
                          From: {context.effective_from}
                          {context.effective_until && ` • Until: ${context.effective_until}`}
                        </div>
                      )}
                    </div>
                    
                    {context.is_current && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {switching && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                  <span className="text-xs text-gray-600 mt-1">Switching...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
      
      {/* Current Context Info */}
      {currentContext && (
        <div className="flex items-center gap-1">
          {getApprovalLevelBadge(currentContext.approval_level, currentContext.can_approve_overtime_org_wide)}
        </div>
      )}
    </div>
  );
}
