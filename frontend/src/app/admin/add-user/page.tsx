"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import Header from '@/components/Header';

interface Division {
  id: number;
  name: string;
}

interface Position {
  id: number;
  name: string;
}

export default function AddUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    group: "pegawai", // default to pegawai
    nip: "",
    division_id: "none", // Changed from "" to "none"
    position_id: "none", // Changed from "" to "none"
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

  // Fetch divisions and positions on component mount
  useEffect(() => {
    fetchDivisions();
    fetchPositions();
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const validateForm = (): string | null => {
    if (!formData.username.trim()) {
      return "Username is required";
    }
    if (!formData.password.trim()) {
      return "Password is required";
    }
    if (formData.password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Please enter a valid email address";
    }
    if (formData.nip && formData.nip.length < 3) {
      return "NIP must be at least 3 characters";
    }
    if (formData.gaji_pokok && parseFloat(formData.gaji_pokok) < 0) {
      return "Gaji Pokok cannot be negative";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // First, provision the user
      const userResponse = await fetch('/api/admin/users/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
          email: formData.email.trim() || '',
          group: formData.group
        })
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => null);
        throw new Error(extractErrorMessage(errorData) || 'Failed to create user');
      }

      const userData = await userResponse.json();

      // Then, create employee record if NIP is provided
      if (formData.nip.trim()) {
        // Convert "none" values to null for backend
        const divisionId = formData.division_id === "none" ? null : formData.division_id;
        const positionId = formData.position_id === "none" ? null : formData.position_id;

        const employeeResponse = await fetch('/api/admin/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userData.id,
            nip: formData.nip.trim(),
            division_id: divisionId,
            position_id: positionId,
            gaji_pokok: formData.gaji_pokok ? parseFloat(formData.gaji_pokok) : null,
            tmt_kerja: formData.tmt_kerja || null,
            tempat_lahir: formData.tempat_lahir.trim() || null,
            tanggal_lahir: formData.tanggal_lahir || null,
            fullname: formData.fullname.trim() || null,
          })
        });

        if (!employeeResponse.ok) {
          const errorData = await employeeResponse.json().catch(() => null);
          throw new Error(extractErrorMessage(errorData) || 'Failed to create employee record');
        }
      }

      setSuccess("User created successfully!");
      
      // Reset form
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
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Add Employee" 
        subtitle="Create a new employee with an associated user account"
        username="Admin"
        role="admin"
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Employee Information</CardTitle>
            <CardDescription className="text-gray-600">
              Fill in account and employee details to create a new user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* User Account Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Account Details</h3>
                  <p className="text-sm text-gray-600 mt-1">Basic user account information</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                      Username <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter username"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password (min 6 characters)"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="group" className="text-sm font-medium text-gray-700">
                      Role <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.group}
                      onValueChange={(value: string) => handleSelectChange("group", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pegawai">Pegawai (Employee)</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Employee Details Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Employee Details</h3>
                  <p className="text-sm text-gray-600 mt-1">Professional and personal information</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nip" className="text-sm font-medium text-gray-700">
                      NIP (Employee ID)
                    </Label>
                    <Input
                      id="nip"
                      name="nip"
                      type="text"
                      value={formData.nip}
                      onChange={handleInputChange}
                      placeholder="Enter NIP (Employee ID)"
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullname" className="text-sm font-medium text-gray-700">
                      Full Name
                    </Label>
                    <Input
                      id="fullname"
                      name="fullname"
                      type="text"
                      value={formData.fullname}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="division_id" className="text-sm font-medium text-gray-700">
                      Division
                    </Label>
                    <Select
                      value={formData.division_id}
                      onValueChange={(value: string) => handleSelectChange("division_id", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Division</SelectItem>
                        {divisions.map((division) => (
                          <SelectItem key={division.id} value={division.id.toString()}>
                            {division.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position_id" className="text-sm font-medium text-gray-700">
                      Position
                    </Label>
                    <Select
                      value={formData.position_id}
                      onValueChange={(value: string) => handleSelectChange("position_id", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Position</SelectItem>
                        {positions.map((position) => (
                          <SelectItem key={position.id} value={position.id.toString()}>
                            {position.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="gaji_pokok" className="text-sm font-medium text-gray-700">
                      Gaji Pokok (Base Salary)
                    </Label>
                    <Input
                      id="gaji_pokok"
                      name="gaji_pokok"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.gaji_pokok}
                      onChange={handleInputChange}
                      placeholder="e.g., 5000000.00"
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tmt_kerja" className="text-sm font-medium text-gray-700">
                      TMT Kerja (Work Start Date)
                    </Label>
                    <Input
                      id="tmt_kerja"
                      name="tmt_kerja"
                      type="date"
                      value={formData.tmt_kerja}
                      onChange={handleInputChange}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tempat_lahir" className="text-sm font-medium text-gray-700">
                      Tempat Lahir (Birth Place)
                    </Label>
                    <Input
                      id="tempat_lahir"
                      name="tempat_lahir"
                      type="text"
                      value={formData.tempat_lahir}
                      onChange={handleInputChange}
                      placeholder="e.g., Jakarta"
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_lahir" className="text-sm font-medium text-gray-700">
                      Tanggal Lahir (Birth Date)
                    </Label>
                    <Input
                      id="tanggal_lahir"
                      name="tanggal_lahir"
                      type="date"
                      value={formData.tanggal_lahir}
                      onChange={handleInputChange}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Error and Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="px-6 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Employee...
                    </div>
                  ) : (
                    "Create Employee"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
