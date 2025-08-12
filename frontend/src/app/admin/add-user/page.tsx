"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
    division_id: "",
    position_id: ""
  });

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

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
        setDivisions(data);
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
        setPositions(data);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

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
        const errorData = await userResponse.json();
        throw new Error(errorData.detail || 'Failed to create user');
      }

      const userData = await userResponse.json();

      // Then, create employee record if NIP is provided
      if (formData.nip) {
        const employeeResponse = await fetch('/api/admin/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userData.id,
            nip: formData.nip,
            division_id: formData.division_id || null,
            position_id: formData.position_id || null
          })
        });

        if (!employeeResponse.ok) {
          const errorData = await employeeResponse.json();
          throw new Error(errorData.detail || 'Failed to create employee record');
        }
      }

      setSuccess("User created successfully!");
      setFormData({
        username: "",
        email: "",
        password: "",
        group: "pegawai",
        nip: "",
        division_id: "",
        position_id: ""
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
        title="Add New User" 
        subtitle="Create a new user account and assign them to a role"
        username="Admin"
        role="admin"
      />
      
      <div className="max-w-2xl mx-auto px-4 py-8">

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Fill in the details to create a new user account</CardDescription>
          </CardHeader>
          <CardContent>
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

                  <div className="space-y-2">
                    <Label htmlFor="group">Role *</Label>
                    <Select
                      id="group"
                      name="group"
                      required
                      value={formData.group}
                      onChange={handleInputChange}
                    >
                      <option value="pegawai">Pegawai</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Employee Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Employee Details (Optional)</h3>
                
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="division_id">Division</Label>
                    <Select
                      id="division_id"
                      name="division_id"
                      value={formData.division_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Division</option>
                      {divisions.map((division) => (
                        <option key={division.id} value={division.id}>
                          {division.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position_id">Position</Label>
                    <Select
                      id="position_id"
                      name="position_id"
                      value={formData.position_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Position</option>
                      {positions.map((position) => (
                        <option key={position.id} value={position.id}>
                          {position.name}
                        </option>
                      ))}
                    </Select>
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
                  {isLoading ? "Creating User..." : "Create User"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
