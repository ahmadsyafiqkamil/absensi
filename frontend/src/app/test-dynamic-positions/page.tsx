"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Crown, AlertTriangle, CheckCircle } from "lucide-react";
import PositionSwitcherDynamic from '@/components/PositionSwitcherDynamic';

interface UserInfo {
  username: string;
  employee?: {
    fullname: string;
    nip: string;
  };
  positions?: any[];
  approval_capabilities?: {
    approval_level: number;
    active_positions: any[];
  };
}

export default function TestDynamicPositionsPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/v2/auth/me/', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Not authenticated - please login first');
            return;
          }
          throw new Error(`Failed to fetch user info: ${response.status}`);
        }
        
        const data = await response.json();
        setUserInfo(data);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user info');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading user information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Please login first, then return to this page.
            </p>
            <Button 
              className="mt-4 w-full" 
              onClick={() => window.location.href = '/login'}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🎯 Dynamic Position Switcher Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Current User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <strong>Username:</strong> {userInfo?.username}
                </div>
                {userInfo?.employee && (
                  <>
                    <div>
                      <strong>Full Name:</strong> {userInfo.employee.fullname}
                    </div>
                    <div>
                      <strong>NIP:</strong> {userInfo.employee.nip}
                    </div>
                  </>
                )}
                
                {userInfo?.positions && (
                  <div>
                    <strong>Total Positions:</strong> {userInfo.positions.length}
                  </div>
                )}
                
                {userInfo?.approval_capabilities && (
                  <div>
                    <strong>Max Approval Level:</strong>
                    <Badge 
                      variant={userInfo.approval_capabilities.approval_level >= 2 ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      Level {userInfo.approval_capabilities.approval_level}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Position Switcher Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Dynamic Position Switcher
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-3">Position Switcher Component:</p>
                  <PositionSwitcherDynamic size="md" showLabel={true} />
                </div>
                
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Features:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Automatically loads positions for current authenticated user</li>
                    <li>Shows all positions assigned to the user (not hardcoded)</li>
                    <li>Displays approval levels for each position</li>
                    <li>Indicates primary position with crown icon</li>
                    <li>Auto-refreshes page after switching</li>
                    <li>Hides if user not authenticated or has no positions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* User Positions Details */}
        {userInfo?.positions && userInfo.positions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Available Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userInfo.positions.map((position, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{position.name || `Position ${index + 1}`}</span>
                      {position.is_primary && <Crown className="h-4 w-4 text-yellow-600" />}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>Level: {position.approval_level || 0}</div>
                      <div>Status: {position.is_active ? 'Active' : 'Inactive'}</div>
                      {position.can_approve_overtime_org_wide && (
                        <Badge variant="outline" className="text-xs">Org-wide</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">1</Badge>
                <span>Position Switcher akan menampilkan semua posisi yang dimiliki user yang sedang login</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">2</Badge>
                <span>Tidak ada hardcoded username atau posisi - semuanya dinamis dari backend</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">3</Badge>
                <span>Test dengan user yang berbeda akan menampilkan posisi yang berbeda pula</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">4</Badge>
                <span>Component akan tersembunyi jika user tidak punya posisi atau tidak login</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

