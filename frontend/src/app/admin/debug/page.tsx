"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCookies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/cookies');
      const data = await response.json();
      setDebugInfo((prev: any) => ({ ...prev, cookies: data }));
    } catch (error) {
      console.error('Error testing cookies:', error);
    }
    setLoading(false);
  };

  const testBackend = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/backend');
      const data = await response.json();
      setDebugInfo((prev: any) => ({ ...prev, backend: data }));
    } catch (error) {
      console.error('Error testing backend:', error);
    }
    setLoading(false);
  };

  const testProvision = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: `test_${Date.now()}`,
          password: 'testpass',
          email: 'test@example.com',
          group: 'pegawai'
        })
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { rawResponse: text };
      }
      
      setDebugInfo((prev: any) => ({ 
        ...prev, 
        provision: { 
          status: response.status, 
          ok: response.ok, 
          data 
        } 
      }));
    } catch (error) {
      console.error('Error testing provision:', error);
      setDebugInfo((prev: any) => ({ 
        ...prev, 
        provision: { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      }));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Debug Page</h1>
          <p className="text-gray-600">Debug authentication and API connectivity issues</p>
        </div>

        <div className="space-y-6">
          {/* Test Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Debug Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={testCookies} disabled={loading}>
                  Test Cookies
                </Button>
                <Button onClick={testBackend} disabled={loading}>
                  Test Backend
                </Button>
                <Button onClick={testProvision} disabled={loading}>
                  Test Provision
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Debug Results */}
          {debugInfo && (
            <Card>
              <CardHeader>
                <CardTitle>Debug Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
