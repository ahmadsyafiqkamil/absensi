"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Users, Settings, AlertCircle, Eye, TreePine, Shield, UserPlus } from "lucide-react";
import { RoleTemplate, Role } from "@/lib/types";

interface Division {
  id: number;
  name: string;
}

interface Position {
  id: number;
  name: string;
}

interface TemplateSelection {
  template: RoleTemplate | null;
  customRoles: string[];
  primaryRole: string;
}

export default function AddUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("templates");

  // Role Template System
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);
  const [templateSelection, setTemplateSelection] = useState<TemplateSelection>({
    template: null,
    customRoles: [],
    primaryRole: ""
  });

  // Legacy role system (for backward compatibility)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [primaryRole, setPrimaryRole] = useState<string>("");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    nip: "",
    division_id: "none",
    position_id: "none",
    gaji_pokok: "",
    tmt_kerja: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    fullname: "",
  });

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  function extractErrorMessage(data: any): string {
    try {
      if (!data) return 'Unknown error';
      if (typeof data === 'string') return data;
      if (Array.isArray(data)) return data.map(String).join(', ');
      if (data.detail) return String(data.detail);
      if (data.non_field_errors) {
        const a = Array.isArray(data.non_field_errors) ? data.non_field_errors : [data.non_field_errors];
        return a.map(String).join(', ');
      }
      const messages: string[] = [];
      for (const [key, value] of Object.entries(data)) {
        if (key === 'detail') continue;
        if (Array.isArray(value)) {
          messages.push(`${key}: ${(value as any[]).map(String).join(', ')}`);
        } else if (value) {
          messages.push(`${key}: ${String(value)}`);
        }
      }
      return messages.length ? messages.join(' | ') : JSON.stringify(data);
    } catch {
      return 'Unknown error';
    }
  }


  // Fetch all required data on component mount
  useEffect(() => {
    fetchDivisions();
    fetchPositions();
    fetchRoleTemplates();
    fetchAvailableRoles();
  }, []);

  // Update template selection when template changes
  useEffect(() => {
    if (selectedTemplate) {
      setTemplateSelection(prev => ({
        ...prev,
        template: selectedTemplate,
        primaryRole: selectedTemplate.base_role_category
      }));
    }
  }, [selectedTemplate]);

  // Update legacy role system when template selection changes
  useEffect(() => {
    if (templateSelection.primaryRole) {
      setPrimaryRole(templateSelection.primaryRole);
    }
  }, [templateSelection.primaryRole]);

  const fetchDivisions = async () => {
    try {
      const response = await fetch('/api/admin/divisions');
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data?.results ?? []);
        setDivisions(items);
      }
    } catch (error) {
      console.error('Error fetching divisions:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/admin/positions');
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data?.results ?? []);
        setPositions(items);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const fetchRoleTemplates = async () => {
    try {
      const response = await fetch('/api/admin/role-templates/');
      if (response.ok) {
        const data = await response.json();
        setRoleTemplates(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching role templates:', error);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles/');
      if (response.ok) {
        const data = await response.json();
        setAvailableRoles(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching available roles:', error);
    }
  };

  const handleTemplateSelect = (template: RoleTemplate) => {
    setSelectedTemplate(template);
    setActiveTab("preview");
  };

  const handleCustomRoleSelect = (roleName: string) => {
    setTemplateSelection(prev => ({
      ...prev,
      customRoles: prev.customRoles.includes(roleName)
        ? prev.customRoles.filter(r => r !== roleName)
        : [...prev.customRoles, roleName]
    }));
  };

  const getRoleDisplayName = (roleName: string) => {
    const role = availableRoles.find(r => r.name === roleName);
    return role?.display_name || roleName;
  };

  const getApprovalLevelDescription = (level: number) => {
    switch (level) {
      case 0: return "No Approval - Basic employee access";
      case 1: return "Division Level - Can approve within division";
      case 2: return "Organization Level - Full approval authority";
      default: return `Level ${level}`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return '🔧';
      case 'organizational': return '🏢';
      case 'departmental': return '🏗️';
      default: return '📄';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'system': return 'bg-purple-100 text-purple-800';
      case 'organizational': return 'bg-blue-100 text-blue-800';
      case 'departmental': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Validate primary role selection
    if (!primaryRole) {
      setError("Please select a Primary Role");
      setIsLoading(false);
      return;
    }

    if (selectedRoles.length === 0) {
      setError("Please select at least one role");
      setIsLoading(false);
      return;
    }

    try {
      // First, provision the user
      const userResponse = await fetch('/api/admin/users/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          group: formData.group
        })
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData) || 'Failed to create user');
      }

      const userData = await userResponse.json();

      let employeeData = null;

      // Then, create employee record if NIP is provided
      if (formData.nip) {
        const employeeResponse = await fetch('/api/admin/employees/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userData.id,
            nip: formData.nip,
            division_id: formData.division_id === 'none' ? null : formData.division_id,
            position_id: formData.position_id === 'none' ? null : formData.position_id,
            gaji_pokok: formData.gaji_pokok ? formData.gaji_pokok : null,
            tmt_kerja: formData.tmt_kerja || null,
            tempat_lahir: formData.tempat_lahir || null,
            tanggal_lahir: formData.tanggal_lahir || null,
            fullname: formData.fullname || null,
          })
        });

        if (!employeeResponse.ok) {
          const errorData = await employeeResponse.json().catch(() => null);
          throw new Error(extractErrorMessage(errorData) || 'Failed to create employee record');
        }

        employeeData = await employeeResponse.json();
      }

      // Assign multiple roles to the user/employee
      if (selectedRoles.length > 0) {
        // Get all groups first to map role names to IDs
        const groupsResponse = await fetch('/api/admin/groups');
        const groupsData = groupsResponse.ok ? await groupsResponse.json() : [];
        const groupMap = Array.isArray(groupsData) ? groupsData : (groupsData.results || []);

        // Create a map of role name to group ID
        const roleNameToId: { [key: string]: number } = {};
        groupMap.forEach((group: any) => {
          roleNameToId[group.name] = group.id;
        });

        // For user roles (always assign to user)
        for (const roleName of selectedRoles) {
          try {
            const groupId = roleNameToId[roleName];
            if (!groupId) {
              console.warn(`Group ID not found for role: ${roleName}`);
              continue;
            }

            const roleResponse = await fetch('/api/admin/employee-roles/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user: userData.id,
                group: groupId,
                is_primary: roleName === primaryRole,
              })
            });

            if (!roleResponse.ok) {
              const errorData = await roleResponse.json().catch(() => null);
              console.warn(`Failed to assign role ${roleName} to user:`, errorData);
            }
          } catch (error) {
            console.warn(`Error assigning role ${roleName} to user:`, error);
          }
        }

        // For employee roles (if employee was created)
        if (employeeData && formData.nip) {
          for (const roleName of selectedRoles) {
            try {
              const groupId = roleNameToId[roleName];
              if (!groupId) {
                console.warn(`Group ID not found for role: ${roleName}`);
                continue;
              }

              const roleResponse = await fetch('/api/admin/employee-roles/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  employee: employeeData.id,
                  group: groupId,
                  is_primary: roleName === primaryRole,
                })
              });

              if (!roleResponse.ok) {
                const errorData = await roleResponse.json().catch(() => null);
                console.warn(`Failed to assign role ${roleName} to employee:`, errorData);
              }
            } catch (error) {
              console.warn(`Error assigning role ${roleName} to employee:`, error);
            }
          }
        }
      }

      setSuccess("User created successfully with " + selectedRoles.length + " role(s) assigned!");
      setFormData({
        username: "",
        email: "",
        password: "",
        group: "pegawai",
        nip: "",
        division_id: "none",
        position_id: "none",
        gaji_pokok: "",
        tmt_kerja: "",
        tempat_lahir: "",
        tanggal_lahir: "",
        fullname: "",
      });

      // Reset multi-role state
      setSelectedRoles([]);
      setPrimaryRole("");

      // Redirect to admin dashboard after 2 seconds
      setTimeout(() => {
        router.push('/admin');
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header
        title="Add Employee with Advanced Role Management"
        subtitle="Create a new employee with role templates, hierarchy, and permissions"
        username="Admin"
        role="admin"
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <UserPlus className="w-8 h-8" />
              Create New Employee with Role Management
            </CardTitle>
            <CardDescription className="text-blue-100 text-lg">
              Advanced employee creation with template-based roles and permission management
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="templates" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Role Templates
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex items-center gap-2">
                    <TreePine className="w-4 h-4" />
                    Custom Roles
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Preview & Confirm
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Employee Details
                  </TabsTrigger>
                </TabsList>
              </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Account Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Account Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password"
                    />
                  </div>

                  {/* Multi-Role Selection */}
                  <div className="space-y-2 col-span-2">
                    <Label>Roles & Permissions *</Label>
                    <RoleMultiSelect
                      options={roleOptions}
                      selectedRoles={selectedRoles}
                      primaryRole={primaryRole}
                      onRolesChange={setSelectedRoles}
                      onPrimaryRoleChange={setPrimaryRole}
                      placeholder="Select additional roles..."
                    />
                  </div>
                </div>
              </div>

              {/* Employee Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Employee Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="nip">NIP</Label>
                  <Input
                    id="nip"
                    name="nip"
                    type="text"
                    value={formData.nip}
                    onChange={handleInputChange}
                    placeholder="Enter NIP (Employee ID)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullname">Full Name</Label>
                  <Input
                    id="fullname"
                    name="fullname"
                    type="text"
                    value={formData.fullname}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="division_id">Division</Label>
                    <Select value={formData.division_id} onValueChange={(value) => handleSelectChange('division_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Division</SelectItem>
                        {divisions.map((division) => (
                          <SelectItem key={division.id} value={String(division.id)}>
                            {division.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position_id">Position</Label>
                    <Select value={formData.position_id} onValueChange={(value) => handleSelectChange('position_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Position</SelectItem>
                        {positions.map((position) => (
                          <SelectItem key={position.id} value={String(position.id)}>
                            {position.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gaji_pokok">Gaji Pokok</Label>
                    <Input
                      id="gaji_pokok"
                      name="gaji_pokok"
                      type="number"
                      step="0.01"
                      value={formData.gaji_pokok}
                      onChange={handleInputChange}
                      placeholder="cth: 5000000.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tmt_kerja">TMT Kerja</Label>
                    <Input
                      id="tmt_kerja"
                      name="tmt_kerja"
                      type="date"
                      value={formData.tmt_kerja}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
                    <Input
                      id="tempat_lahir"
                      name="tempat_lahir"
                      type="text"
                      value={formData.tempat_lahir}
                      onChange={handleInputChange}
                      placeholder="cth: Jakarta"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                    <Input
                      id="tanggal_lahir"
                      name="tanggal_lahir"
                      type="date"
                      value={formData.tanggal_lahir}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Error and Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                  {success}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Creating Employee..." : "Create Employee"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}