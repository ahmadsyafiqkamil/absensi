"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, User, Briefcase, Shield, RefreshCw, CheckCircle } from "lucide-react";

interface PositionContext {
  assignment_id: number;
  position_id: number;
  position_name: string;
  approval_level: number;
  can_approve_overtime_org_wide: boolean;
  is_primary: boolean;
  is_current: boolean;
  effective_from: string;
  effective_until?: string;
}

interface UserData {
  id: number;
  username: string;
  employee?: any;
  current_context?: any;
  available_contexts?: PositionContext[];
}

export default function PositionSwitcherFromAuthMe() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [contexts, setContexts] = useState<PositionContext[]>([]);
  const [currentContext, setCurrentContext] = useState<PositionContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    try {
      console.log('🔄 Position Switcher: Fetching user data from /auth/me');
      
      const timestamp = Date.now();
      const response = await fetch(`/api/v2/auth/me?_=${timestamp}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data: UserData = await response.json();
        console.log('✅ Position Switcher: User data received:', data);
        
        setUserData(data);
        
        if (data.available_contexts && data.available_contexts.length > 0) {
          setContexts(data.available_contexts);
          
          // Find current context
          const current = data.available_contexts.find(ctx => ctx.is_current);
          setCurrentContext(current || data.available_contexts[0]);
          
          console.log(`📍 Position Switcher: Found ${data.available_contexts.length} contexts`);
          console.log('🎯 Current context:', current);
          setError(null);
        } else {
          console.log('📝 Position Switcher: No position contexts available');
          setContexts([]);
          setCurrentContext(null);
        }
      } else if (response.status === 401) {
        console.log('🔒 Position Switcher: User not authenticated, component will be hidden');
        setContexts([]);
        setCurrentContext(null);
        setError(null); // Don't show error for unauthenticated users
        return;
      } else {
        console.error('❌ Position Switcher: API error:', response.status, response.statusText);
        setError(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Position Switcher: Network error:', error);
      setError('Network Error');
    } finally {
      setIsLoading(false);
    }
  };

  const switchPosition = async (assignmentId: number) => {
    if (isSwitching) return;
    
    setIsSwitching(true);
    
    try {
      console.log(`🔄 Position Switcher: Switching to assignment ${assignmentId}`);
      
      // First get CSRF token
      const csrfResponse = await fetch('/api/v2/auth/csrf', {
        credentials: 'include'
      });
      
      let csrfToken = '';
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken;
        console.log('🔐 Position Switcher: Got CSRF token');
      }
      
      const requestBody = { assignment_id: assignmentId };
      console.log('🔄 Position Switcher: Request body:', requestBody);
      
      const response = await fetch('/api/v2/employees/employees/switch_position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      console.log('🔄 Position Switcher: Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Position Switcher: Switch successful:', result);
        
        // Update current context immediately
        const newCurrent = contexts.find(ctx => ctx.assignment_id === assignmentId);
        if (newCurrent) {
          setCurrentContext(newCurrent);
          
          // Update contexts to reflect new current state
          const updatedContexts = contexts.map(ctx => ({
            ...ctx,
            is_current: ctx.assignment_id === assignmentId
          }));
          setContexts(updatedContexts);
        }
        
        // Refresh page to update all components
        console.log('🔄 Position Switcher: Refreshing page to update all components');
        setTimeout(() => {
          window.location.reload();
        }, 500);
        
      } else {
        const errorData = await response.json();
        console.error('❌ Position Switcher: Switch failed:', errorData);
        console.error('❌ Position Switcher: Full response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorData
        });
        setError(`Switch failed: ${errorData.error || errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Position Switcher: Switch error:', error);
      setError('Network error during switch');
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Don't render if not authenticated or no contexts
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  if (error && !contexts.length) {
    return null; // Hide component on error
  }

  if (!contexts.length) {
    return null; // Hide if no contexts available
  }

  // Single position - show as badge only
  if (contexts.length === 1) {
    const singleContext = contexts[0];
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Briefcase className="h-3 w-3" />
        {singleContext.position_name}
        {singleContext.is_primary && (
          <Shield className="h-3 w-3 text-blue-600" />
        )}
      </Badge>
    );
  }

  // Multiple positions - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2"
          disabled={isSwitching}
        >
          {isSwitching ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Briefcase className="h-4 w-4" />
          )}
          
          <span className="hidden sm:inline">
            {currentContext?.position_name || 'Select Position'}
          </span>
          
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Switch Position Context
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {contexts.map((context) => (
          <DropdownMenuItem
            key={context.assignment_id}
            onClick={() => switchPosition(context.assignment_id)}
            disabled={context.is_current || isSwitching}
            className="flex flex-col items-start gap-1 p-3"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="font-medium">{context.position_name}</span>
                {context.is_current && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {context.is_primary && (
                  <Shield className="h-4 w-4 text-blue-600" />
                )}
              </div>
              
              <Badge variant="outline" className="text-xs">
                Level {context.approval_level}
              </Badge>
            </div>
            
            <div className="text-xs text-gray-500 flex flex-wrap gap-1">
              {context.is_primary && (
                <span className="bg-blue-50 text-blue-700 px-1 rounded">Primary</span>
              )}
              {context.is_current && (
                <span className="bg-green-50 text-green-700 px-1 rounded">Active</span>
              )}
              {context.can_approve_overtime_org_wide && (
                <span className="bg-purple-50 text-purple-700 px-1 rounded">Org-wide</span>
              )}
              <span className="text-gray-400">
                from {new Date(context.effective_from).toLocaleDateString()}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={fetchUserData} className="text-center">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Contexts
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
