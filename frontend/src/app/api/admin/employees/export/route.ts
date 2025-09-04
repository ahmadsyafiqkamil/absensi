import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Verify admin
    const meResponse = await fetch(`${backendBase}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!meResponse.ok) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }
    const userData = await meResponse.json();
    const isAdmin = userData.groups?.includes('admin') || userData.is_superuser;
    if (!isAdmin) {
      return NextResponse.json({ detail: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { employee_ids, format = 'excel' } = body;

    if (!employee_ids || !Array.isArray(employee_ids)) {
      return NextResponse.json({ detail: 'employee_ids array is required' }, { status: 400 });
    }

    // Get employee data from backend
    const employeesPromises = employee_ids.map(async (id: number) => {
      const response = await fetch(`${backendBase}/api/admin/employees/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store',
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    });

    const employees = (await Promise.all(employeesPromises)).filter(Boolean);

    if (format === 'excel') {
      // Create CSV content for Excel
      const csvHeaders = [
        'ID',
        'NIP',
        'Full Name',
        'Username',
        'Email',
        'Division',
        'Position',
        'Gaji Pokok',
        'TMT Kerja',
        'Tempat Lahir',
        'Tanggal Lahir',
        'Roles',
        'Primary Role'
      ].join(',');

      const csvRows = employees.map((emp: any) => [
        emp.id || '',
        `"${emp.nip || ''}"`,
        `"${emp.fullname || ''}"`,
        `"${emp.user?.username || ''}"`,
        `"${emp.user?.email || ''}"`,
        `"${emp.division?.name || ''}"`,
        `"${emp.position?.name || ''}"`,
        emp.gaji_pokok || '',
        emp.tmt_kerja || '',
        `"${emp.tempat_lahir || ''}"`,
        emp.tanggal_lahir || '',
        `"${emp.roles?.map((r: any) => r.group_name).join('; ') || ''}"`,
        `"${emp.primary_role?.group_name || ''}"`
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      // Return CSV as Excel file
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': 'attachment; filename="employees-export.xlsx"'
        }
      });
    }

    return NextResponse.json({ detail: 'Unsupported export format' }, { status: 400 });

  } catch (error) {
    console.error('Error exporting employees:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
