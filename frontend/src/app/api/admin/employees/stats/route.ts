import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const backendBase = 'http://backend:8000';

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

    // Get employees data for statistics
    const employeesResponse = await fetch(`${backendBase}/api/admin/employees-with-roles/`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!employeesResponse.ok) {
      return NextResponse.json({ detail: 'Failed to fetch employee data' }, { status: 500 });
    }

    const employeesData = await employeesResponse.json();

    // Calculate statistics
    const total_employees = employeesData.count || 0;
    const active_employees = employeesData.results?.filter((emp: any) => emp.user?.is_active).length || 0;
    const inactive_employees = total_employees - active_employees;

    // Group by division
    const employees_by_division: Record<string, number> = {};
    employeesData.results?.forEach((emp: any) => {
      const division = emp.division?.name || 'No Division';
      employees_by_division[division] = (employees_by_division[division] || 0) + 1;
    });

    // Group by role
    const employees_by_role: Record<string, number> = {};
    employeesData.results?.forEach((emp: any) => {
      emp.roles?.forEach((role: any) => {
        const roleName = role.group_name || 'No Role';
        employees_by_role[roleName] = (employees_by_role[roleName] || 0) + 1;
      });
    });

    // Calculate recent hires (employees with TMT kerja in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent_hires = employeesData.results?.filter((emp: any) => {
      if (!emp.tmt_kerja) return false;
      const tmtDate = new Date(emp.tmt_kerja);
      return tmtDate >= thirtyDaysAgo;
    }).length || 0;

    // Calculate upcoming birthdays (next 30 days)
    const upcoming_birthdays = employeesData.results?.filter((emp: any) => {
      if (!emp.tanggal_lahir) return false;
      const today = new Date();
      const birthDate = new Date(emp.tanggal_lahir);
      birthDate.setFullYear(today.getFullYear());

      if (birthDate < today) {
        birthDate.setFullYear(today.getFullYear() + 1);
      }

      const diffTime = birthDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays <= 30;
    }).length || 0;

    const stats = {
      total_employees,
      active_employees,
      inactive_employees,
      employees_by_division,
      employees_by_role,
      recent_hires,
      upcoming_birthdays,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching employee statistics:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
