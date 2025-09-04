"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import DashboardLayout from '@/components/DashboardLayout';
import { RoleMultiSelect, type RoleOption } from "@/components/ui/role-multiselect";
import { CheckCircle, AlertCircle, UserPlus } from "lucide-react";

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
}

interface Division {
  id: number;
  name: string;
}

interface Position {
  id: number;
  name: string;
}

// Role options for multi-select
const roleOptions: RoleOption[] = [
  // Primary Roles
  { value: "admin", label: "Administrator", group: "Primary", isPrimary: true },
  { value: "supervisor", label: "Supervisor", group: "Primary", isPrimary: true },
  { value: "pegawai", label: "Pegawai", group: "Primary", isPrimary: true },

  // Diplomatic & Consular Roles
  { value: "konsuler", label: "Konsuler", group: "Diplomatic" },
  { value: "protokol", label: "Protokol", group: "Diplomatic" },
  { value: "ekonomi", label: "Ekonomi", group: "Diplomatic" },
  { value: "sosial_budaya", label: "Sosial Budaya", group: "Diplomatic" },
  { value: "politik", label: "Politik", group: "Diplomatic" },
  { value: "imigrasi", label: "Imigrasi", group: "Diplomatic" },

  // Operational Support Roles
  { value: "finance", label: "Pengelola Keuangan", group: "Support" },
  { value: "hr", label: "Human Resources", group: "Support" },
  { value: "manager", label: "Manager", group: "Support" },
  { value: "it_support", label: "IT Support", group: "Support" },
  { value: "security", label: "Security", group: "Support" },
  { value: "driver", label: "Driver", group: "Support" },
  { value: "housekeeping", label: "Housekeeping", group: "Support" },
  { value: "maintenance", label: "Maintenance", group: "Support" },

  // Administrative Roles
  { value: "secretary", label: "Secretary", group: "Administrative" },
  { value: "assistant", label: "Assistant", group: "Administrative" },
  { value: "clerk", label: "Clerk", group: "Administrative" },
  { value: "coordinator", label: "Coordinator", group: "Administrative" },
];

export default function AddUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Multi-role state
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [primaryRole, setPrimaryRole] = useState<string>("");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    group: "pegawai", // default to pegawai (will be updated by primary role)
    nip: "",
    division_id: "none",
    position_id: "none",
    gaji_pokok: "",
    tmt_kerja: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    fullname: "",
  });

  // Auto-generate password feature
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);

  // Generate secure password
  const generateSecurePassword = useCallback(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }, []);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(true);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [userInfo, setUserInfo] = useState<{username: string, role: string}>({username: '', role: ''});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  function extractErrorMessage(data: unknown): string {
    try {
      if (!data) return 'Unknown error';
      if (typeof data === 'string') return data;
      if (Array.isArray(data)) return data.map(String).join(', ');

      // Type guard untuk memeriksa apakah data adalah object
      if (typeof data === 'object' && data !== null) {
        const dataObj = data as Record<string, unknown>;

        if ('detail' in dataObj && dataObj.detail) {
          return String(dataObj.detail);
        }

        if ('non_field_errors' in dataObj && dataObj.non_field_errors) {
          const nonFieldErrors = dataObj.non_field_errors;
          const a = Array.isArray(nonFieldErrors) ? nonFieldErrors : [nonFieldErrors];
          return a.map(String).join(', ');
        }

        const messages: string[] = [];
        for (const [key, value] of Object.entries(dataObj)) {
          if (key === 'detail') continue;
          if (Array.isArray(value)) {
            messages.push(`${key}: ${value.map(String).join(', ')}`);
          } else if (value) {
            messages.push(`${key}: ${String(value)}`);
          }
        }
        return messages.length ? messages.join(' | ') : JSON.stringify(data);
      }

      return JSON.stringify(data);
    } catch {
      return 'Unknown error';
    }
  }


  // Load user info and fetch divisions/positions on component mount
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUserInfo({
            username: data.username || 'Admin',
            role: data.groups?.[0] || data.role || 'admin'
          });
        }
      } catch (err) {
        console.warn('Failed to load user info:', err);
      }
    };

    loadUserInfo();
    fetchDivisions();
    fetchPositions();
  }, []);

  // Update formData.group when primaryRole changes
  useEffect(() => {
    if (primaryRole) {
      setFormData(prev => ({
        ...prev,
        group: primaryRole
      }));
      // Auto-add primary role to selected roles
      if (!selectedRoles.includes(primaryRole)) {
        setSelectedRoles(prev => [...prev, primaryRole]);
      }
    }
  }, [primaryRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update selectedRoles when primaryRole changes
  useEffect(() => {
    if (primaryRole && !selectedRoles.includes(primaryRole)) {
      setSelectedRoles(prev => [...prev, primaryRole]);
    }
  }, [primaryRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate password when enabled
  useEffect(() => {
    if (autoGeneratePassword) {
      const newPassword = generateSecurePassword();
      setFormData(prev => ({
        ...prev,
        password: newPassword,
        confirmPassword: newPassword
      }));
    } else {
      // Clear password when disabled
      setFormData(prev => ({
        ...prev,
        password: "",
        confirmPassword: ""
      }));
    }
  }, [autoGeneratePassword, generateSecurePassword]);

  const fetchDivisions = async () => {
    try {
      setIsLoadingDivisions(true);
      const response = await fetch('/api/admin/divisions');
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data?.results ?? []);
        setDivisions(items);
      }
    } catch (error) {
      console.error('Error fetching divisions:', error);
    } finally {
      setIsLoadingDivisions(false);
    }
  };

  const fetchPositions = async () => {
    try {
      setIsLoadingPositions(true);
      const response = await fetch('/api/admin/positions');
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data?.results ?? []);
        setPositions(items);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setIsLoadingPositions(false);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!formData.username.trim()) {
      setError("Username wajib diisi");
      setIsLoading(false);
      return;
    }

    if (!autoGeneratePassword && !formData.password) {
      setError("Password wajib diisi");
      setIsLoading(false);
      return;
    }

    if (!autoGeneratePassword && formData.password !== formData.confirmPassword) {
      setError("Password tidak cocok");
      setIsLoading(false);
      return;
    }

    // Validate primary role selection
    if (!primaryRole) {
      setError("Silakan pilih Primary Role");
      setIsLoading(false);
      return;
    }

    if (selectedRoles.length === 0) {
      setError("Silakan pilih minimal satu role");
      setIsLoading(false);
      return;
    }

    // Validate email format if provided
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Silakan masukkan alamat email yang valid");
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
        groupMap.forEach((group: { name: string; id: number }) => {
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

      setSuccess("Pegawai berhasil dibuat dengan " + selectedRoles.length + " role yang ditugaskan!");
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
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
      setAutoGeneratePassword(false);

      // Redirect to employees list after 2 seconds
      setTimeout(() => {
        router.push('/admin/employees');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Tambah Pegawai Baru"
      subtitle="Buat pegawai baru dengan penugasan role dan izin yang fleksibel"
      username={userInfo.username}
      role={userInfo.role}
    >
      <div className="max-w-4xl mx-auto px-4 py-8">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Informasi Pegawai dengan Multi-Role
            </CardTitle>
            <CardDescription>
              Isi detail akun, informasi pegawai, dan tugaskan multiple role dengan izin yang sesuai
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Error Alert */}
            {error && (
              <Alert className="border-red-200 bg-red-50 mb-6">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-200 bg-green-50 mb-6">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Back Button */}
            <div className="flex justify-between items-center mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/employees')}
                className="flex items-center gap-2"
              >
                ← Kembali ke Daftar Pegawai
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Account Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Detail Akun</h3>
                
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

                {/* Password Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoGeneratePassword"
                      checked={autoGeneratePassword}
                      onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="autoGeneratePassword" className="text-sm">
                      Auto-generate secure password
                    </Label>
                  </div>

                  {!autoGeneratePassword && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required={!autoGeneratePassword}
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          required={!autoGeneratePassword}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                  )}

                  {autoGeneratePassword && (
                    <div className="space-y-2">
                      <Label>Generated Password</Label>
                      <div className="p-3 bg-gray-50 border rounded-md">
                        <code className="text-sm font-mono">{formData.password}</code>
                        <button
                          type="button"
                          onClick={() => {
                            const newPassword = generateSecurePassword();
                            setFormData(prev => ({
                              ...prev,
                              password: newPassword,
                              confirmPassword: newPassword
                            }));
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          🔄 Regenerate
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        This password will be automatically set for the user. Please save it securely.
                      </p>
                    </div>
                  )}
                </div>

                {/* Multi-Role Selection */}
                <div className="space-y-2">
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
                    {isLoadingDivisions ? (
                      <LoadingSkeleton />
                    ) : (
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
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position_id">Position</Label>
                    {isLoadingPositions ? (
                      <LoadingSkeleton />
                    ) : (
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
                    )}
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
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="flex-1 sm:flex-initial"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Membuat Pegawai...
                    </>
                  ) : (
                    "Buat Pegawai"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}