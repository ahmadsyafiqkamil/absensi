"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ApiEndpoint {
  name: string;
  url: string;
  status: 'checking' | 'available' | 'unavailable';
  responseTime?: number;
}

export default function ApiStatusCheck() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([
    { name: 'Employees API', url: '/api/v2/employees/', status: 'checking' },
    { name: 'Settings API', url: '/api/v2/settings/', status: 'checking' },
    { name: 'Attendance API', url: '/api/v2/attendance/', status: 'checking' },
    { name: 'Corrections API', url: '/api/v2/corrections/', status: 'checking' },
    { name: 'Overtime API', url: '/api/v2/overtime/', status: 'checking' },
    { name: 'Reporting API', url: '/api/v2/reporting/', status: 'checking' },
  ]);

  const [overallStatus, setOverallStatus] = useState<'checking' | 'healthy' | 'degraded' | 'down'>('checking');

  useEffect(() => {
    checkAllEndpoints();
  }, []);

  const checkEndpoint = async (endpoint: ApiEndpoint): Promise<ApiEndpoint> => {
    const startTime = Date.now();
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        cache: 'no-store'
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          ...endpoint,
          status: 'available',
          responseTime
        };
      } else {
        return {
          ...endpoint,
          status: 'unavailable',
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        ...endpoint,
        status: 'unavailable',
        responseTime
      };
    }
  };

  const checkAllEndpoints = async () => {
    const updatedEndpoints = await Promise.all(
      endpoints.map(endpoint => checkEndpoint(endpoint))
    );
    
    setEndpoints(updatedEndpoints);
    
    // Determine overall status
    const availableCount = updatedEndpoints.filter(e => e.status === 'available').length;
    const totalCount = updatedEndpoints.length;
    
    if (availableCount === totalCount) {
      setOverallStatus('healthy');
    } else if (availableCount > totalCount / 2) {
      setOverallStatus('degraded');
    } else {
      setOverallStatus('down');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'unavailable':
        return <Badge className="bg-red-100 text-red-800">Unavailable</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Checking</Badge>;
    }
  };

  const getOverallStatusBadge = () => {
    switch (overallStatus) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">All Systems Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded Performance</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-800">Service Disruption</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Checking Status</Badge>;
    }
  };

  const getOverallStatusColor = () => {
    switch (overallStatus) {
      case 'healthy':
        return 'border-green-200 bg-green-50';
      case 'degraded':
        return 'border-yellow-200 bg-yellow-50';
      case 'down':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={`border-2 ${getOverallStatusColor()}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            API System Status
            {getOverallStatusBadge()}
          </CardTitle>
          <CardDescription>
            Real-time status of all API endpoints
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Individual Endpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {endpoints.map((endpoint, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                {endpoint.name}
                {getStatusBadge(endpoint.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <strong>URL:</strong> {endpoint.url}
                </div>
                {endpoint.responseTime !== undefined && (
                  <div className="text-sm text-gray-600">
                    <strong>Response Time:</strong> {endpoint.responseTime}ms
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Last checked: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={checkAllEndpoints}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Status
        </button>
      </div>

      {/* API Information */}
      <Card>
        <CardHeader>
          <CardTitle>API Information</CardTitle>
          <CardDescription>
            Details about the new modular API system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">New V2 Endpoints:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li><strong>/api/v2/employees/</strong> - Employee management</li>
              <li><strong>/api/v2/settings/</strong> - System settings & holidays</li>
              <li><strong>/api/v2/attendance/</strong> - Attendance tracking</li>
              <li><strong>/api/v2/corrections/</strong> - Attendance corrections</li>
              <li><strong>/api/v2/overtime/</strong> - Overtime management</li>
              <li><strong>/api/v2/reporting/</strong> - Report generation</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>✅ Modular architecture with separate apps</li>
              <li>✅ Role-based access control</li>
              <li>✅ Comprehensive error handling</li>
              <li>✅ Type-safe API responses</li>
              <li>✅ Backward compatibility with legacy endpoints</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
