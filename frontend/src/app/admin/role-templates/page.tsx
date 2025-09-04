"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Users, Settings, BarChart3, TreePine } from "lucide-react";
import RoleTemplateManager from "@/components/RoleTemplateManager";
import RoleHierarchyTree from "@/components/RoleHierarchyTree";
import PermissionInheritanceViewer from "@/components/PermissionInheritanceViewer";
import RoleAnalyticsDashboard from "@/components/RoleAnalyticsDashboard";
import { Role, RoleTemplate } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RoleTemplatesPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("templates");
  const [systemStatus, setSystemStatus] = useState<{
    rolesCount: number;
    templatesCount: number;
    hierarchyDepth: number;
    isLoading: boolean;
  }>({
    rolesCount: 0,
    templatesCount: 0,
    hierarchyDepth: 0,
    isLoading: true
  });

  // Load system status on mount
  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      setSystemStatus(prev => ({ ...prev, isLoading: true }));

      // Load roles count
      const rolesResponse = await fetch('/api/admin/roles/?page_size=1');
      const rolesData = await rolesResponse.json();

      // Load templates count
      const templatesResponse = await fetch('/api/admin/role-templates/?page_size=1');
      const templatesData = await templatesResponse.json();

      // Load hierarchy analytics
      const analyticsResponse = await fetch('/api/admin/roles/analytics/?type=usage');
      const analyticsData = await analyticsResponse.json();

      setSystemStatus({
        rolesCount: rolesData.count || 0,
        templatesCount: templatesData.count || 0,
        hierarchyDepth: analyticsData.hierarchy_depth || 0,
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading system status:', error);
      setSystemStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setActiveTab("permissions"); // Switch to permissions tab when role is selected
  };

  const handleTemplateSelect = (template: RoleTemplate) => {
    setSelectedTemplate(template);
  };

  const handleRefresh = () => {
    loadSystemStatus();
    // Trigger refresh in child components if needed
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with system status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TreePine className="w-8 h-8 text-green-600" />
            Role Templates & Hierarchy
          </h1>
          <p className="text-gray-600 mt-1">
            Manage role templates, view hierarchy structure, and analyze permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {systemStatus.isLoading ? '...' : systemStatus.rolesCount}
                </div>
                <div className="text-sm text-gray-600">Active Roles</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Settings className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {systemStatus.isLoading ? '...' : systemStatus.templatesCount}
                </div>
                <div className="text-sm text-gray-600">Role Templates</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TreePine className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {systemStatus.isLoading ? '...' : systemStatus.hierarchyDepth}
                </div>
                <div className="text-sm text-gray-600">Max Hierarchy Depth</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">Phase 2</div>
                <div className="text-sm text-gray-600">System Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Templates</CardTitle>
              <CardDescription>
                Create and manage reusable role templates with predefined permissions and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoleTemplateManager
                onTemplateSelect={handleTemplateSelect}
                showCreateButton={true}
              />
            </CardContent>
          </Card>

          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>Template Details: {selectedTemplate.display_name}</CardTitle>
                <CardDescription>
                  Preview template configuration and usage statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="font-semibold text-lg">{selectedTemplate.usage_count}</div>
                    <div className="text-gray-600 text-sm">Roles Created</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">{Object.keys(selectedTemplate.base_permissions).length}</div>
                    <div className="text-gray-600 text-sm">Permission Types</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">{selectedTemplate.base_approval_level}</div>
                    <div className="text-gray-600 text-sm">Approval Level</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">{selectedTemplate.base_role_priority}</div>
                    <div className="text-gray-600 text-sm">Priority</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Base Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedTemplate.base_permissions).map(([type, actions]) => (
                      <div key={type} className="border rounded-lg p-3">
                        <div className="font-medium capitalize mb-2">{type}</div>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(actions) && actions.map((action) => (
                            <span
                              key={action}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Hierarchy</CardTitle>
              <CardDescription>
                Visual representation of role relationships and inheritance structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoleHierarchyTree
                onRoleSelect={handleRoleSelect}
                showStats={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          {selectedRole ? (
            <PermissionInheritanceViewer
              role={selectedRole}
              showInherited={true}
              showConflicts={false}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">Select a Role</h3>
                  <p className="text-gray-600">
                    Choose a role from the hierarchy tab to view its permissions and inheritance details
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <RoleAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
