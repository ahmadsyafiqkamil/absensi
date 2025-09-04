import React from 'react';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  FileText,
  Download,
  Settings,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Users,
  Shield,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface QuickActionsProps {
  onAddEmployee?: () => void;
  onGenerateReport?: () => void;
  onExportData?: () => void;
  onBulkSettings?: () => void;
  onSendNotification?: () => void;
  onScheduleMeeting?: () => void;
  onViewAnalytics?: () => void;
  onBulkRoleUpdate?: () => void;
}

export default function QuickActions({
  onAddEmployee,
  onGenerateReport,
  onExportData,
  onBulkSettings,
  onSendNotification,
  onScheduleMeeting,
  onViewAnalytics,
  onBulkRoleUpdate
}: QuickActionsProps) {
  const actions = [
    {
      icon: UserPlus,
      label: 'Add Employee',
      onClick: onAddEmployee,
      variant: 'default' as const,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      icon: Users,
      label: 'Bulk Role Update',
      onClick: onBulkRoleUpdate,
      variant: 'outline' as const,
      color: ''
    },
    {
      icon: FileText,
      label: 'Generate Report',
      onClick: onGenerateReport,
      variant: 'outline' as const,
      color: ''
    },
    {
      icon: Download,
      label: 'Export Data',
      onClick: onExportData,
      variant: 'outline' as const,
      color: ''
    },
    {
      icon: Mail,
      label: 'Send Notification',
      onClick: onSendNotification,
      variant: 'outline' as const,
      color: ''
    },
    {
      icon: Calendar,
      label: 'Schedule Meeting',
      onClick: onScheduleMeeting,
      variant: 'outline' as const,
      color: ''
    },
    {
      icon: BarChart3,
      label: 'View Analytics',
      onClick: onViewAnalytics,
      variant: 'outline' as const,
      color: ''
    },
    {
      icon: Settings,
      label: 'Bulk Settings',
      onClick: onBulkSettings,
      variant: 'outline' as const,
      color: ''
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <Button
          key={index}
          onClick={action.onClick}
          variant={action.variant}
          className={`h-20 flex-col gap-2 ${action.color}`}
        >
          <action.icon className="w-6 h-6" />
          <span className="text-sm text-center">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
