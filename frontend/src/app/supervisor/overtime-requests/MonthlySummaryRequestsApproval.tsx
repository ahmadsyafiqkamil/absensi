"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MonthlySummaryRequestsTable from './MonthlySummaryRequestsTable';

export default function MonthlySummaryRequestsApproval() {
  return (
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
  );
}
