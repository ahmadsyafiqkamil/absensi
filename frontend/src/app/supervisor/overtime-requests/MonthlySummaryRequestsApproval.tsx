"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalLevelWarning } from '@/components/ui/approval-level-warning';
import { useSupervisorApprovalLevel } from '@/lib/hooks';
import MonthlySummaryRequestsTable from './MonthlySummaryRequestsTable';

export default function MonthlySummaryRequestsApproval() {
  const { approvalLevel } = useSupervisorApprovalLevel()

  return (
    <div className="space-y-6">
      {/* Approval Level Warning */}
      {/* {approvalLevel !== null && (
        <ApprovalLevelWarning approvalLevel={approvalLevel} />
      )} */}

      <Card>
        <CardHeader>
          <CardTitle>Persetujuan Rekap Bulanan</CardTitle>
          <CardDescription>
            Tinjau dan setujui pengajuan rekap bulanan dari anggota tim Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlySummaryRequestsTable />
        </CardContent>
      </Card>
    </div>
  );
}
