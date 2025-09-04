"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RoleTemplateManager from "@/components/RoleTemplateManager";
import RoleHierarchyTree from "@/components/RoleHierarchyTree";
import PermissionInheritanceViewer from "@/components/PermissionInheritanceViewer";
import RoleAnalyticsDashboard from "@/components/RoleAnalyticsDashboard";
import { Role, RoleTemplate } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RoleTemplatesPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleTemplateSelect = (template: RoleTemplate) => {
    setSelectedTemplate(template);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Templates & Hierarchy</h1>
          <p className="text-gray-600 mt-1">
            Manage role templates, view hierarchy, and analyze permissions
          </p>
        </div>
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
