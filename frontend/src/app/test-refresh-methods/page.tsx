"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, RotateCcw } from "lucide-react";
import PositionSwitcherSimple from '@/components/PositionSwitcherSimple';
import PositionSwitcherWithRouter from '@/components/PositionSwitcherWithRouter';

export default function TestRefreshMethodsPage() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Update timestamp every second to show page refreshes
  useState(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 1000);
    return () => clearInterval(interval);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔄 Position Switch Refresh Methods</h1>
        
        {/* Page Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Page Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                Last Update: {lastRefresh.toLocaleTimeString()}
              </Badge>
              <span className="text-sm text-gray-600">
                This timestamp updates every second to show when page refreshes
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Method 1: Hard Refresh */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-blue-600" />
                Method 1: Hard Refresh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p><strong>Behavior:</strong> Full page reload with <code>window.location.reload()</code></p>
                  <p><strong>Effect:</strong> Complete refresh, all components reset</p>
                  <p><strong>Speed:</strong> Slower but guaranteed to update everything</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Test dengan Position Switcher:</p>
                  <PositionSwitcherSimple />
                </div>
                
                <div className="text-xs text-gray-500">
                  <strong>Expected:</strong> Page akan reload sepenuhnya, timestamp akan reset ke waktu reload
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Method 2: Router Refresh */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                Method 2: Router Refresh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p><strong>Behavior:</strong> Soft refresh with <code>router.refresh()</code></p>
                  <p><strong>Effect:</strong> Updates server components, keeps client state</p>
                  <p><strong>Speed:</strong> Faster, smoother user experience</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Test dengan Position Switcher:</p>
                  <PositionSwitcherWithRouter refreshMethod="router" />
                </div>
                
                <div className="text-xs text-gray-500">
                  <strong>Expected:</strong> Halaman akan update tanpa reload penuh, timestamp tetap berjalan
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Comparison Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Comparison of Refresh Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Aspect</th>
                    <th className="text-left py-2">Hard Refresh</th>
                    <th className="text-left py-2">Router Refresh</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Speed</td>
                    <td className="py-2">⚡ Slower (full reload)</td>
                    <td className="py-2">🚀 Faster (partial update)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">User Experience</td>
                    <td className="py-2">📄 Page flickers</td>
                    <td className="py-2">✨ Smooth transition</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Data Update</td>
                    <td className="py-2">✅ Guaranteed fresh data</td>
                    <td className="py-2">⚠️ Depends on implementation</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Client State</td>
                    <td className="py-2">🔄 Reset completely</td>
                    <td className="py-2">💾 Preserved</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Network Usage</td>
                    <td className="py-2">📡 Full page resources</td>
                    <td className="py-2">📊 Only necessary data</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">Best Use Case</td>
                    <td className="py-2">🎯 Critical updates needed</td>
                    <td className="py-2">🎨 Better UX, frequent switches</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">1</Badge>
                <span>Perhatikan timestamp di atas yang update setiap detik</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">2</Badge>
                <span>Test <strong>Hard Refresh</strong>: Switch position di card kiri → Page akan reload penuh, timestamp reset</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">3</Badge>
                <span>Test <strong>Router Refresh</strong>: Switch position di card kanan → Page update smooth, timestamp tetap jalan</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">4</Badge>
                <span>Buka Developer Tools → Network tab untuk melihat perbedaan request yang dibuat</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
