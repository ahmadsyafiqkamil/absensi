"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import * as Dialog from "@radix-ui/react-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleTemplate, Role } from "@/lib/types";
import { api } from "@/lib/api";

interface RoleTemplateManagerProps {
  onTemplateSelect?: (template: RoleTemplate) => void;
  showCreateButton?: boolean;
}

export default function RoleTemplateManager({
  onTemplateSelect,
  showCreateButton = true
}: RoleTemplateManagerProps) {
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: "",
    display_name: "",
    description: "",
    category: "custom" as RoleTemplate['category'],
    base_role_category: "employee" as Role['role_category'],
    base_approval_level: 0,
    base_permissions: {},
    base_max_users: undefined as number | undefined,
    base_role_priority: 0,
  });

  // Create role from template form state
  const [createRoleForm, setCreateRoleForm] = useState({
    role_name: "",
    display_name: "",
    description: "",
    parent_role_id: undefined as number | undefined,
  });

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = selectedCategory !== "all" ? { category: selectedCategory } : {};
      const response = await fetch(`/api/admin/role-templates/?${new URLSearchParams(params as any)}`);

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.results || data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: RoleTemplate['category']) => {
    switch (category) {
      case 'system': return '🔧';
      case 'organizational': return '🏢';
      case 'departmental': return '🏗️';
      default: return '📄';
    }
  };

  const getCategoryColor = (category: RoleTemplate['category']) => {
    switch (category) {
      case 'system': return 'bg-purple-100 text-purple-800';
      case 'organizational': return 'bg-blue-100 text-blue-800';
      case 'departmental': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/admin/role-templates/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add CSRF token if needed
          'X-CSRFToken': document.cookie.split('csrftoken=')[1]?.split(';')[0] || ''
        },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create template');
      }

      setShowCreateDialog(false);
      setCreateForm({
        name: "",
        display_name: "",
        description: "",
        category: "custom",
        base_role_category: "employee",
        base_approval_level: 0,
        base_permissions: {},
        base_max_users: undefined,
        base_role_priority: 0,
      });
      fetchTemplates();
      alert('Template created successfully!');
    } catch (error) {
      console.error('Error creating template:', error);
      alert(`Error creating template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateRoleFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const payload = {
        role_name: createRoleForm.role_name,
        display_name: createRoleForm.display_name || createRoleForm.role_name,
        description: createRoleForm.description,
        parent_role_id: createRoleForm.parent_role_id,
      };

      const response = await fetch(`/api/admin/role-templates/${selectedTemplate.id}/create-role/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create role');

      setShowCreateRoleDialog(false);
      setSelectedTemplate(null);
      setCreateRoleForm({
        role_name: "",
        display_name: "",
        description: "",
        parent_role_id: undefined,
      });
      alert('Role created successfully from template!');
    } catch (error) {
      console.error('Error creating role:', error);
      alert(`Failed to create role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteTemplate = async (templateId: number, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/role-templates/${templateId}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': document.cookie.split('csrftoken=')[1]?.split(';')[0] || ''
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete template');
      }

      fetchTemplates();
      alert('Template deleted successfully!');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const filteredTemplates = templates.filter(template =>
    selectedCategory === "all" || template.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      {/* Header with filters and create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Role Templates</h2>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="system">System Templates</SelectItem>
              <SelectItem value="organizational">Organizational</SelectItem>
              <SelectItem value="departmental">Departmental</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showCreateButton && (
          <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <Dialog.Trigger asChild>
              <Button>Create Template</Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <Dialog.Title className="text-lg font-semibold mb-4">Create Role Template</Dialog.Title>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="template-name">Name</Label>
                      <Input
                        id="template-name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="template_name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-display-name">Display Name</Label>
                      <Input
                        id="template-display-name"
                        value={createForm.display_name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="Template Display Name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Template description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={createForm.category}
                        onValueChange={(value: RoleTemplate['category']) =>
                          setCreateForm(prev => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="organizational">Organizational</SelectItem>
                          <SelectItem value="departmental">Departmental</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Base Role Category</Label>
                      <Select
                        value={createForm.base_role_category}
                        onValueChange={(value: Role['role_category']) =>
                          setCreateForm(prev => ({ ...prev, base_role_category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Approval Level</Label>
                      <Input
                        type="number"
                        value={createForm.base_approval_level}
                        onChange={(e) => setCreateForm(prev => ({
                          ...prev,
                          base_approval_level: parseInt(e.target.value) || 0
                        }))}
                      />
                    </div>
                    <div>
                      <Label>Max Users</Label>
                      <Input
                        type="number"
                        value={createForm.base_max_users || ""}
                        onChange={(e) => setCreateForm(prev => ({
                          ...prev,
                          base_max_users: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div>
                      <Label>Role Priority</Label>
                      <Input
                        type="number"
                        value={createForm.base_role_priority}
                        onChange={(e) => setCreateForm(prev => ({
                          ...prev,
                          base_role_priority: parseInt(e.target.value) || 0
                        }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate}>
                    Create Template
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-8">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{template.display_name}</CardTitle>
                  <Badge className={getCategoryColor(template.category)}>
                    {getCategoryIcon(template.category)} {template.category}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  <div>Base Category: <strong>{template.base_role_category}</strong></div>
                  <div>Approval Level: <strong>{template.base_approval_level}</strong></div>
                  <div>Priority: <strong>{template.base_role_priority}</strong></div>
                  <div>Usage Count: <strong>{template.usage_count}</strong></div>
                </div>

                <div className="flex gap-2">
                  {onTemplateSelect && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTemplateSelect(template)}
                      className="flex-1"
                    >
                      Select
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowCreateRoleDialog(true);
                    }}
                    className="flex-1"
                  >
                    Create Role
                  </Button>

                  {!template.is_system_template && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTemplate(template.id, template.display_name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Role from Template Dialog */}
      <Dialog.Root open={showCreateRoleDialog} onOpenChange={setShowCreateRoleDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Create Role from Template: {selectedTemplate?.display_name}
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  value={createRoleForm.role_name}
                  onChange={(e) => setCreateRoleForm(prev => ({ ...prev, role_name: e.target.value }))}
                  placeholder="new_role_name"
                />
              </div>

              <div>
                <Label htmlFor="role-display-name">Display Name (Optional)</Label>
                <Input
                  id="role-display-name"
                  value={createRoleForm.display_name}
                  onChange={(e) => setCreateRoleForm(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Role Display Name"
                />
              </div>

              <div>
                <Label htmlFor="role-description">Description (Optional)</Label>
                <Textarea
                  id="role-description"
                  value={createRoleForm.description}
                  onChange={(e) => setCreateRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Role description..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateRoleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRoleFromTemplate}>
                Create Role
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
