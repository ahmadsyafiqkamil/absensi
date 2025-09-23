"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { Plus, X, Crown, Shield, Calendar, ArrowLeft } from "lucide-react";
import Header from '@/components/Header';

interface Division {
  id: number;
  name: string;
}

interface Position {
  id: number;
  name: string;
  approval_level: number;
  can_approve_overtime_org_wide: boolean;
}

interface PositionAssignment {
  position_id: number;
  position: Position;
  is_primary: boolean;
  is_active: boolean;
  effective_from: string;
  effective_until: string;
  assignment_notes: string;
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
    division_id: "none",
    position_id: "none", // kept for legacy compatibility
    gaji_pokok: "",
    tmt_kerja: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    fullname: "",
  });

  // Multi-position state
  const [selectedPositions, setSelectedPositions] = useState<PositionAssignment[]>([]);
  const [showMultiPosition, setShowMultiPosition] = useState(false);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
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
        setAvailablePositions(items);
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Multi-position management functions
  const addPositionAssignment = () => {
    const today = new Date().toISOString().split('T')[0];
    const newAssignment: PositionAssignment = {
      position_id: 0,
      position: { id: 0, name: '', approval_level: 0, can_approve_overtime_org_wide: false },
      is_primary: selectedPositions.length === 0, // First position is primary by default
      is_active: true,
      effective_from: today,
      effective_until: '',
      assignment_notes: ''
    };
    setSelectedPositions([...selectedPositions, newAssignment]);
  };

  const removePositionAssignment = (index: number) => {
    const updatedPositions = selectedPositions.filter((_, i) => i !== index);
    // If we removed the primary position, make the first remaining position primary
    if (selectedPositions[index].is_primary && updatedPositions.length > 0) {
      updatedPositions[0].is_primary = true;
    }
    setSelectedPositions(updatedPositions);
  };

  const updatePositionAssignment = (index: number, field: keyof PositionAssignment, value: any) => {
    const updatedPositions = [...selectedPositions];
    
    if (field === 'position_id') {
      const positionId = parseInt(value);
      const selectedPosition = availablePositions.find(p => p.id === positionId);
      if (selectedPosition) {
        updatedPositions[index].position_id = selectedPosition.id;
        updatedPositions[index].position = selectedPosition;
        console.log(`[DEBUG] Updated position assignment ${index}:`, {
          position_id: selectedPosition.id,
          position_name: selectedPosition.name,
          assignment: updatedPositions[index]
        });
      } else {
        console.warn(`[WARNING] Position with ID ${positionId} not found in available positions`);
      }
    } else if (field === 'is_primary' && value) {
      // Only one position can be primary
      updatedPositions.forEach((pos, i) => {
        pos.is_primary = i === index;
      });
      console.log(`[DEBUG] Set position ${index} as primary`);
    } else {
      (updatedPositions[index] as any)[field] = value;
      console.log(`[DEBUG] Updated position assignment ${index} field ${field}:`, value);
    }
    
    setSelectedPositions(updatedPositions);
  };

  const getApprovalLevelBadge = (level: number) => {
    const variant = level >= 2 ? 'default' : level >= 1 ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="text-xs">
        Level {level}
      </Badge>
    );
  };

  const getUsedPositionIds = () => {
    return selectedPositions.map(p => p.position_id).filter(id => id > 0);
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    // Basic validation
    if (!formData.username.trim()) {
      errors.push('Username is required');
    } else {
      // Check for username format
      if (formData.username.length < 3) {
        errors.push('Username must be at least 3 characters long');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
      }
    }
    if (!formData.password.trim()) {
      errors.push('Password is required');
    } else if (formData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    // Position validation for single position mode
    if (!showMultiPosition && formData.position_id === 'none') {
      errors.push('Position is required - please select a position');
    }
    
    // Multi-position validation
    if (showMultiPosition) {
      if (selectedPositions.length === 0) {
        errors.push('At least one position must be assigned when multi-position is enabled');
      }
      
      const primaryPositions = selectedPositions.filter(p => p.is_primary);
      if (primaryPositions.length === 0 && selectedPositions.length > 0) {
        errors.push('At least one position must be marked as primary');
      }
      if (primaryPositions.length > 1) {
        errors.push('Only one position can be marked as primary');
      }
      
      // Check for invalid position selections
      const invalidPositions = selectedPositions.filter(p => p.position_id === 0);
      if (invalidPositions.length > 0) {
        errors.push('All position assignments must have a position selected');
      }
      
      // Check for positions that don't exist in available positions
      const invalidPositionIds = selectedPositions.filter(p => 
        p.position_id > 0 && !availablePositions.find(ap => ap.id === p.position_id)
      );
      if (invalidPositionIds.length > 0) {
        errors.push('Some selected positions are no longer available');
      }
      
      // Check for duplicate positions
      const positionIds = selectedPositions.map(p => p.position_id).filter(id => id > 0);
      const uniquePositionIds = new Set(positionIds);
      if (positionIds.length !== uniquePositionIds.size) {
        errors.push('Duplicate positions are not allowed');
      }
      
      // Check effective dates
      for (let i = 0; i < selectedPositions.length; i++) {
        const assignment = selectedPositions[i];
        if (assignment.effective_until && assignment.effective_from) {
          if (new Date(assignment.effective_until) <= new Date(assignment.effective_from)) {
            errors.push(`Position ${i + 1}: Effective until date must be after effective from date`);
          }
        }
        
        // Check if position object is properly populated
        if (assignment.position_id > 0 && (!assignment.position || assignment.position.id !== assignment.position_id)) {
          errors.push(`Position ${i + 1}: Position data is not properly loaded`);
        }
      }
    }
    
    return errors;
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/users/check-username?username=${encodeURIComponent(username)}`);
      if (response.ok) {
        const data = await response.json();
        return data.available;
      }
      return true; // If check fails, assume available
    } catch (error) {
      console.warn('Username availability check failed:', error);
      return true; // If check fails, assume available
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Initialize success message
    let successMessage = "User created successfully!";

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      setIsLoading(false);
      return;
    }

    // Check username availability
    console.log('[DEBUG] Checking username availability for:', formData.username);
    const isUsernameAvailable = await checkUsernameAvailability(formData.username);
    if (!isUsernameAvailable) {
      setError(`Username '${formData.username}' is already taken. Please choose a different username.`);
      setIsLoading(false);
      return;
    }

    try {
      // Debug: Check cookies and backend connectivity
      console.log('[DEBUG] Testing backend connectivity...');
      const debugResponse = await fetch('/api/debug/backend');
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('[DEBUG] Backend connectivity:', debugData);
      }
      
      // Ensure CSRF token is available
      await fetch('/api/csrf-token');
      
      console.log('[DEBUG] Calling provision endpoint with data:', {
        username: formData.username,
        email: formData.email,
        group: formData.group
      });
      
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

      console.log('[DEBUG] User provision response status:', userResponse.status);
      console.log('[DEBUG] User provision response headers:', Object.fromEntries(userResponse.headers.entries()));
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('[DEBUG] User provision error response:', errorText);
        console.error('[DEBUG] User provision error status:', userResponse.status);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { detail: errorText };
        }
        
        // Handle specific error cases
        if (userResponse.status === 500) {
          // Check if it's a duplicate username error
          if (errorText.includes('Duplicate entry') && errorText.includes('username')) {
            throw new Error(`Username '${formData.username}' already exists. Please choose a different username.`);
          }
          throw new Error(`Server error: ${extractErrorMessage(errorData) || 'Internal server error'}`);
        }
        
        throw new Error(extractErrorMessage(errorData) || `Failed to create user (${userResponse.status})`);
      }

      const userData = await userResponse.json();

      // Validate user creation result
      if (!userData.id) {
        console.error('[ERROR] User ID is missing from user creation result:', userData);
        throw new Error('User ID is missing from creation result');
      }

      console.log('[DEBUG] User created successfully:', { id: userData.id, username: userData.username });

      // Then, create employee record if NIP is provided
      if (formData.nip) {
        const employeeData = {
          user_id: userData.id,
          nip: formData.nip,
          division_id: formData.division_id === 'none' ? null : formData.division_id,
          gaji_pokok: formData.gaji_pokok ? formData.gaji_pokok : null,
          tmt_kerja: formData.tmt_kerja || null,
          tempat_lahir: formData.tempat_lahir || null,
          tanggal_lahir: formData.tanggal_lahir || null,
          fullname: formData.fullname || null,
        };

        // Add position for single position mode
        if (!showMultiPosition && formData.position_id !== 'none') {
          (employeeData as any).position_id = formData.position_id;
        }

        const employeeResponse = await fetch('/api/admin/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employeeData)
        });

        if (!employeeResponse.ok) {
          const errorData = await employeeResponse.json().catch(() => null);
          throw new Error(extractErrorMessage(errorData) || 'Failed to create employee record');
        }

        const employeeResult = await employeeResponse.json();

        // Debug logging for employee creation result
        console.log('[DEBUG] Employee creation result:', employeeResult);
        console.log('[DEBUG] Employee ID:', employeeResult.id);
        console.log('[DEBUG] Employee ID type:', typeof employeeResult.id);
        console.log('[DEBUG] Employee response status:', employeeResponse.status);
        console.log('[DEBUG] Employee response headers:', Object.fromEntries(employeeResponse.headers.entries()));

        // Debug logging for multi-position assignment
        console.log('[DEBUG] Multi-position check:', {
          showMultiPosition,
          selectedPositionsLength: selectedPositions.length,
          selectedPositions: selectedPositions,
          willAssignPositions: showMultiPosition && selectedPositions.length > 0
        });

        // Assign multiple positions if multi-position is enabled
        if (showMultiPosition && selectedPositions.length > 0) {
          console.log('[DEBUG] Multi-position assignment:', {
            showMultiPosition,
            selectedPositionsCount: selectedPositions.length,
            selectedPositions: selectedPositions,
            employeeResult: employeeResult
          });
          
          // Validate employee ID exists
          if (!employeeResult.id) {
            console.error('[ERROR] Employee ID is missing from employee creation result:', employeeResult);
            throw new Error('Employee ID is missing from creation result');
          }
          
          const assignmentErrors: string[] = [];
          const successfulAssignments: string[] = [];
          
          for (const positionAssignment of selectedPositions) {
            if (positionAssignment.position_id > 0) {
              try {
                const assignmentData = {
                  employee_id: employeeResult.id,
                  position_id: positionAssignment.position_id,
                  is_primary: positionAssignment.is_primary,
                  is_active: positionAssignment.is_active,
                  effective_from: positionAssignment.effective_from,
                  effective_until: positionAssignment.effective_until || null,
                  assignment_notes: positionAssignment.assignment_notes || `Assigned during user creation - ${new Date().toISOString()}`
                };

                console.log(`[DEBUG] Assigning position ${positionAssignment.position?.name || positionAssignment.position_id}:`, assignmentData);
                console.log(`[DEBUG] Assignment data JSON string:`, JSON.stringify(assignmentData));
                console.log(`[DEBUG] Assignment data employee_id:`, assignmentData.employee_id);
                console.log(`[DEBUG] Assignment data employee_id type:`, typeof assignmentData.employee_id);

                const assignmentResponse = await fetch('/api/v2/employees/employee-positions/assign_position/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(assignmentData)
                });

                if (!assignmentResponse.ok) {
                  const errorData = await assignmentResponse.json().catch(() => null);
                  const errorMessage = `Failed to assign position ${positionAssignment.position?.name || positionAssignment.position_id}: ${errorData?.detail || errorData?.error || 'Unknown error'}`;
                  console.error(`❌ ${errorMessage}`, errorData);
                  assignmentErrors.push(errorMessage);
                } else {
                  const assignmentResult = await assignmentResponse.json();
                  const successMessage = `Successfully assigned position ${positionAssignment.position?.name || positionAssignment.position_id}`;
                  console.log(`✅ ${successMessage}:`, assignmentResult);
                  successfulAssignments.push(positionAssignment.position?.name || `Position ${positionAssignment.position_id}`);
                }
              } catch (error) {
                const errorMessage = `Network error assigning position ${positionAssignment.position?.name || positionAssignment.position_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                console.error(`❌ ${errorMessage}`, error);
                assignmentErrors.push(errorMessage);
              }
            } else {
              const errorMessage = `Invalid position assignment: position_id is ${positionAssignment.position_id}`;
              console.error(`❌ ${errorMessage}`, positionAssignment);
              assignmentErrors.push(errorMessage);
            }
          }

          // Report assignment results
          if (assignmentErrors.length > 0) {
            console.warn(`[WARNING] ${assignmentErrors.length} position assignment(s) failed:`, assignmentErrors);
            // Don't throw error, but show warning in success message
            successMessage += ` Warning: ${assignmentErrors.length} position assignment(s) failed.`;
          }
          
          if (successfulAssignments.length > 0) {
            console.log(`[SUCCESS] ${successfulAssignments.length} position assignment(s) successful:`, successfulAssignments);
          }
        }
      }

      // Update success message with position assignment info
      if (showMultiPosition && selectedPositions.length > 0) {
        const assignedCount = selectedPositions.filter(p => p.position_id > 0).length;
        successMessage += ` ${assignedCount} position(s) assigned.`;
      }
      setSuccess(successMessage);
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
      setSelectedPositions([]);
      setShowMultiPosition(false);

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
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Previous Page
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>Fill in account and employee details</CardDescription>
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
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      required={true}
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
                    <Select value={formData.group} onValueChange={(value) => handleSelectChange('group', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pegawai">Pegawai</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="position_id">Position {!showMultiPosition && <span className="text-red-500">*</span>}</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="multi-position"
                          checked={showMultiPosition}
                          onCheckedChange={(checked) => {
                            setShowMultiPosition(!!checked);
                            if (!checked) {
                              setSelectedPositions([]);
                            }
                          }}
                        />
                        <Label htmlFor="multi-position" className="text-sm font-normal">
                          Enable Multi-Position
                        </Label>
                      </div>
                    </div>
                    
                    {!showMultiPosition ? (
                      <Select value={formData.position_id} onValueChange={(value) => handleSelectChange('position_id', value)}>
                        <SelectTrigger className={formData.position_id === 'none' ? 'border-red-300' : ''}>
                          <SelectValue placeholder="Select Position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-gray-400">Select Position (Required)</SelectItem>
                          {positions.map((position) => (
                            <SelectItem key={position.id} value={String(position.id)}>
                              <div className="flex items-center justify-between w-full">
                                <span>{position.name}</span>
                                {getApprovalLevelBadge(position.approval_level)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Multi-Position Assignment
                            </h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addPositionAssignment}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Position
                            </Button>
                          </div>
                          <p className="text-xs text-gray-600">
                            Assign multiple positions to this employee. One position must be marked as primary.
                          </p>
                        </div>
                        
                        {selectedPositions.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No positions assigned. Click "Add Position" to start.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {selectedPositions.map((assignment, index) => (
                              <div key={index} className="p-3 border rounded bg-white space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Position {index + 1}</span>
                                    {assignment.is_primary && (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <Crown className="h-3 w-3" />
                                        Primary
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePositionAssignment(index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs">Position</Label>
                                    <Select 
                                      value={String(assignment.position_id || '')} 
                                      onValueChange={(value) => updatePositionAssignment(index, 'position_id', value)}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Select Position" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0">Select Position</SelectItem>
                                        {availablePositions
                                          .filter(pos => 
                                            pos.id === assignment.position_id || 
                                            !getUsedPositionIds().includes(pos.id)
                                          )
                                          .map((position) => (
                                            <SelectItem key={position.id} value={String(position.id)}>
                                              <div className="flex items-center justify-between w-full">
                                                <span>{position.name}</span>
                                                <div className="flex items-center gap-1">
                                                  {getApprovalLevelBadge(position.approval_level)}
                                                  {position.can_approve_overtime_org_wide && (
                                                    <Badge variant="outline" className="text-xs">Org</Badge>
                                                  )}
                                                </div>
                                              </div>
                                            </SelectItem>
                                          ))
                                        }
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label className="text-xs">Effective From</Label>
                                    <Input
                                      type="date"
                                      value={assignment.effective_from}
                                      onChange={(e) => updatePositionAssignment(index, 'effective_from', e.target.value)}
                                      className="h-8"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs flex items-center gap-2">
                                      <Calendar className="h-3 w-3" />
                                      Effective Until (Optional)
                                    </Label>
                                    <Input
                                      type="date"
                                      value={assignment.effective_until}
                                      onChange={(e) => updatePositionAssignment(index, 'effective_until', e.target.value)}
                                      className="h-8"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-4">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox 
                                          checked={assignment.is_primary}
                                          onCheckedChange={(checked) => updatePositionAssignment(index, 'is_primary', !!checked)}
                                        />
                                        <Label className="text-xs">Primary Position</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox 
                                          checked={assignment.is_active}
                                          onCheckedChange={(checked) => updatePositionAssignment(index, 'is_active', !!checked)}
                                        />
                                        <Label className="text-xs">Active</Label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-xs">Assignment Notes</Label>
                                  <Input
                                    placeholder="Optional notes for this position assignment..."
                                    value={assignment.assignment_notes}
                                    onChange={(e) => updatePositionAssignment(index, 'assignment_notes', e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Position Summary */}
                        {selectedPositions.length > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                            <h5 className="text-sm font-medium text-blue-900 mb-2">Position Summary</h5>
                            <div className="space-y-1">
                              {selectedPositions.map((assignment, index) => {
                                if (assignment.position_id === 0) return null;
                                return (
                                  <div key={index} className="text-xs text-blue-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span>{assignment.position.name}</span>
                                      {assignment.is_primary && (
                                        <Badge variant="outline" className="text-xs">
                                          <Crown className="h-2 w-2 mr-1" />
                                          Primary
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {getApprovalLevelBadge(assignment.position.approval_level)}
                                      {assignment.position.can_approve_overtime_org_wide && (
                                        <Badge variant="outline" className="text-xs">Org</Badge>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
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
