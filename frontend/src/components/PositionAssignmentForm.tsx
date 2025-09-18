"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Users, Plus } from "lucide-react";
import type { Position, Employee, PositionAssignmentFormData } from "@/lib/types";

interface PositionAssignmentFormProps {
  employee?: Employee;
  employees?: Employee[];
  positions: Position[];
  onSubmit: (data: PositionAssignmentFormData) => Promise<void>;
  onBulkSubmit?: (data: any) => Promise<void>;
  loading?: boolean;
  trigger?: React.ReactNode;
  mode?: 'single' | 'bulk';
}

export default function PositionAssignmentForm({
  employee,
  employees = [],
  positions,
  onSubmit,
  onBulkSubmit,
  loading = false,
  trigger,
  mode = 'single'
}: PositionAssignmentFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<PositionAssignmentFormData>({
    employee_id: employee?.id || 0,
    position_id: 0,
    is_primary: false,
    is_active: true,
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: '',
    assignment_notes: ''
  });
  const [bulkData, setBulkData] = useState({
    employee_ids: [] as number[],
    position_id: 0,
    is_primary: false,
    is_active: true,
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: '',
    assignment_notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'bulk' && onBulkSubmit) {
      await onBulkSubmit(bulkData);
    } else {
      await onSubmit(formData);
    }
    
    setOpen(false);
    // Reset form
    setFormData({
      employee_id: employee?.id || 0,
      position_id: 0,
      is_primary: false,
      is_active: true,
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: '',
      assignment_notes: ''
    });
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="h-4 w-4 mr-2" />
      {mode === 'bulk' ? 'Bulk Assign Position' : 'Assign Position'}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {mode === 'bulk' ? 'Bulk Assign Position' : 'Assign Position'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'bulk' 
              ? 'Assign a position to multiple employees at once'
              : `Assign a new position to ${employee?.fullname || 'employee'}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'bulk' ? (
            // Bulk Assignment Form
            <div className="space-y-4">
              <div>
                <Label htmlFor="employee_ids">Select Employees</Label>
                <Card className="mt-2">
                  <CardContent className="p-3 max-h-32 overflow-y-auto">
                    {employees.map((emp) => (
                      <div key={emp.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`emp-${emp.id}`}
                          checked={bulkData.employee_ids.includes(emp.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setBulkData(prev => ({
                                ...prev,
                                employee_ids: [...prev.employee_ids, emp.id]
                              }));
                            } else {
                              setBulkData(prev => ({
                                ...prev,
                                employee_ids: prev.employee_ids.filter(id => id !== emp.id)
                              }));
                            }
                          }}
                        />
                        <label htmlFor={`emp-${emp.id}`} className="text-sm">
                          {emp.fullname} ({emp.nip})
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label htmlFor="bulk_position">Position</Label>
                <Select 
                  value={bulkData.position_id.toString()} 
                  onValueChange={(value) => setBulkData(prev => ({ ...prev, position_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>
                        {pos.name} (Level {pos.approval_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            // Single Assignment Form
            <div className="space-y-4">
              <div>
                <Label htmlFor="position">Position</Label>
                <Select 
                  value={formData.position_id.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, position_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>
                        {pos.name} (Level {pos.approval_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Common Fields */}
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={mode === 'bulk' ? bulkData.is_primary : formData.is_primary}
                onCheckedChange={(checked) => {
                  if (mode === 'bulk') {
                    setBulkData(prev => ({ ...prev, is_primary: !!checked }));
                  } else {
                    setFormData(prev => ({ ...prev, is_primary: !!checked }));
                  }
                }}
              />
              <Label htmlFor="is_primary" className="text-sm">
                Set as Primary Position
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={mode === 'bulk' ? bulkData.is_active : formData.is_active}
                onCheckedChange={(checked) => {
                  if (mode === 'bulk') {
                    setBulkData(prev => ({ ...prev, is_active: !!checked }));
                  } else {
                    setFormData(prev => ({ ...prev, is_active: !!checked }));
                  }
                }}
              />
              <Label htmlFor="is_active" className="text-sm">
                Active Assignment
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="effective_from">Effective From</Label>
              <Input
                id="effective_from"
                type="date"
                value={mode === 'bulk' ? bulkData.effective_from : formData.effective_from}
                onChange={(e) => {
                  if (mode === 'bulk') {
                    setBulkData(prev => ({ ...prev, effective_from: e.target.value }));
                  } else {
                    setFormData(prev => ({ ...prev, effective_from: e.target.value }));
                  }
                }}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="effective_until">Effective Until (Optional)</Label>
              <Input
                id="effective_until"
                type="date"
                value={mode === 'bulk' ? bulkData.effective_until : formData.effective_until}
                onChange={(e) => {
                  if (mode === 'bulk') {
                    setBulkData(prev => ({ ...prev, effective_until: e.target.value }));
                  } else {
                    setFormData(prev => ({ ...prev, effective_until: e.target.value }));
                  }
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="assignment_notes">Assignment Notes</Label>
            <Textarea
              id="assignment_notes"
              placeholder="Reason for this position assignment..."
              value={mode === 'bulk' ? bulkData.assignment_notes : formData.assignment_notes}
              onChange={(e) => {
                if (mode === 'bulk') {
                  setBulkData(prev => ({ ...prev, assignment_notes: e.target.value }));
                } else {
                  setFormData(prev => ({ ...prev, assignment_notes: e.target.value }));
                }
              }}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Assigning...' : (mode === 'bulk' ? 'Bulk Assign' : 'Assign Position')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
