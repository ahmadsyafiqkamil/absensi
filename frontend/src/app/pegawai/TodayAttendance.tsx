"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Attendance = {
  id: number;
  date_local: string;
  timezone: string;
  check_in_at_utc: string | null;
  check_in_lat: string | null;
  check_in_lng: string | null;
  check_out_at_utc: string | null;
  check_out_lat: string | null;
  check_out_lng: string | null;
  minutes_late: number;
  total_work_minutes: number;
  within_geofence?: boolean;
  employee_note?: string | null;
  note?: string | null;
  overtime_minutes?: number;
  overtime_amount?: number;
  overtime_approved?: boolean;
};

type WorkSettings = {
  id: number;
  timezone: string;
  workdays: string[];
  start_time: string;
  end_time: string;
  friday_start_time: string;
  friday_end_time: string;
  office_latitude: string;
  office_longitude: string;
  geofence_radius_meters: number;
};

function fmtTime(iso: string | null, tz: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz || "Asia/Dubai",
    });
  } catch {
    return "-";
  }
}

function fmtDate(date: Date, timezone: string) {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  });
}

function fmtTimeOnly(date: Date, timezone: string) {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timezone,
  });
}

function toISODate(d: Date, timezone?: string) {
  if (timezone) {
    try {
      const tzDate = new Date(d.toLocaleString("en-US", { timeZone: timezone }));
      return `${tzDate.getFullYear()}-${String(tzDate.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(tzDate.getDate()).padStart(2, "0")}`;
    } catch {
      // fallback below
    }
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TodayAttendance() {
  console.log("TodayAttendance component rendering...");

  const [data, setData] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(new Date());
  const [workSettings, setWorkSettings] = useState<WorkSettings | null>(null);
  const [currentDate, setCurrentDate] = useState<string>("");
  const [overtimeData, setOvertimeData] = useState<any>(null);

  // ---- FETCHERS -------------------------------------------------------------

  // Function to fetch today's attendance data
  const fetchTodayData = useCallback(
    async (
      targetDate: string,
      options: { skipSettings?: boolean; showLoading?: boolean } = {}
    ) => {
      const { skipSettings = false, showLoading = false } = options;

      console.log(
        "fetchTodayData called for date:",
        targetDate,
        "skipSettings:",
        skipSettings
      );

      if (showLoading) setLoading(true);

      const q = `?start=${targetDate}&end=${targetDate}`;

      try {
        const nocacheInit: RequestInit = { cache: "no-store", credentials: "include" };
        const requests: Promise<Response>[] = [
          // Primary: current user's attendance today
          fetch(`/api/v2/attendance/today/?_=${Date.now()}`, nocacheInit),
          // Holidays for the date
          fetch(`/api/v2/settings/holidays/${q}&_=${Date.now()}`, nocacheInit),
        ];

        // Only fetch settings if not skipping (to prevent loops)
        if (!skipSettings) {
          requests.push(fetch("/api/v2/settings/work"));
        }

        const responses = await Promise.all(requests);
        const [attResp, holResp, settingsResp] = responses as [Response, Response, Response?];

        // --- Attendance (current user's today record)
        let att: any = null;
        if (attResp.ok) {
          const d = await attResp.json().catch(() => ({}));
          // The /today endpoint returns a single object; safeguard if backend changes
          att = d && !Array.isArray(d) ? d : (d?.results?.[0] || null);
        } else {
          // Fallback: use employee-scoped list filtered by date to get current user's record
          try {
            // Use main list endpoint which already scopes by role; for employee it returns own records
            const fallbackResp = await fetch(`/api/v2/attendance/attendance?start=${targetDate}&end=${targetDate}&page=1&page_size=1&_=${Date.now()}`, nocacheInit);
            if (fallbackResp.ok) {
              const fd = await fallbackResp.json().catch(() => ({}));
              att = Array.isArray(fd) ? fd[0] || null : fd?.results?.[0] || null;
            }
          } catch {
            // ignore
          }
        }

        // Only set data if it's for the current date
        if (att && att.date_local === targetDate) {
          setData(att);
        } else {
          setData(null);
        }

        // --- Holidays
        const holD = await holResp.json().catch(() => ({}));
        const holItems = Array.isArray(holD) ? holD : holD?.results || [];
        const isHolidayToday =
          Array.isArray(holItems) &&
          holItems.some((h: any) => (h?.date || h?.date_local) === targetDate);
        setIsHoliday(isHolidayToday);

        // --- Overtime (temporarily disabled to avoid noisy errors)
        setOvertimeData(null);

        // --- Settings (optional)
        if (!skipSettings && settingsResp) {
          const settingsData = await settingsResp.json().catch(() => ({}));
          if (settingsResp.ok && settingsData) {
            setWorkSettings(settingsData);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    []
  );

  // ---- EFFECTS -------------------------------------------------------------

  // Fetch work settings once on mount (initial load shows skeleton)
  useEffect(() => {
    const fetchWorkSettings = async () => {
      try {
        const response = await fetch("/api/v2/settings/work");
        if (response.ok) {
          const settingsData = await response.json();
          setWorkSettings(settingsData);
        }
      } catch (error) {
        console.error("Error fetching work settings:", error);
      } finally {
        // kalau settings gagal sekalipun, jangan nge-stuck loading
        setLoading(false);
      }
    };

    fetchWorkSettings();
  }, []);

  // Initial data fetch - depends on workSettings
  useEffect(() => {
    if (workSettings) {
      const tz = workSettings.timezone || "Asia/Dubai";
      const today = toISODate(new Date(), tz);
      setCurrentDate(today);
      // initial fetch: tampilkan loading skeleton
      fetchTodayData(today, { skipSettings: true, showLoading: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workSettings]); // fetchTodayData intentionally excluded

  // Listen for attendance refresh events (from check-in/check-out)
  useEffect(() => {
    const handler = () => {
      console.log("Attendance refresh event received, refreshing data...");
      const tz = workSettings?.timezone || "Asia/Dubai";
      const today = toISODate(new Date(), tz);
      // refresh tanpa flicker
      fetchTodayData(today, { skipSettings: true, showLoading: false });
    };

    window.addEventListener("attendance-refresh", handler);
    return () => window.removeEventListener("attendance-refresh", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workSettings?.timezone, fetchTodayData]);

  // Update current time every 5 seconds and check for date changes
  useEffect(() => {
    const tick = setInterval(() => {
      const newNow = new Date();
      setNow(newNow);

      const tz = workSettings?.timezone || "Asia/Dubai";
      const newDate = toISODate(newNow, tz);

      if (newDate !== currentDate) {
        console.log("Date changed, resetting attendance data");
        setCurrentDate(newDate);
        setData(null);
        setIsHoliday(false);
        // refresh tanpa flicker
        fetchTodayData(newDate, { skipSettings: true, showLoading: false });
      }
    }, 5000);

    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, workSettings?.timezone, fetchTodayData]);

  // Calculate time until next midnight in the work timezone (fixed)
  useEffect(() => {
    if (!workSettings?.timezone) return;

    const tz = workSettings.timezone || "Asia/Dubai";

    const schedule = () => {
      // Keduanya “diproyeksikan” di TZ yang sama agar basis konsisten
      const tzNow = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
      const nextMidnightTz = new Date(tzNow);
      nextMidnightTz.setHours(24, 0, 0, 0);

      const ms = Math.max(nextMidnightTz.getTime() - tzNow.getTime(), 1000);
      const t = setTimeout(() => {
        console.log("Scheduled reset triggered");
        const newDate = toISODate(new Date(), tz);
        setCurrentDate(newDate);
        setData(null);
        setIsHoliday(false);
        // refresh tanpa flicker
        fetchTodayData(newDate, { skipSettings: true, showLoading: false });
        schedule(); // jadwalkan lagi untuk tengah malam berikutnya
      }, ms);

      return t;
    };

    const handle = schedule();
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workSettings?.timezone, fetchTodayData]);

  // ---- DERIVED -------------------------------------------------------------

  const workHours = useMemo(() => {
    if (!data || !data.total_work_minutes) return "-";
    const h = Math.floor(data.total_work_minutes / 60);
    const m = data.total_work_minutes % 60;
    return `${h}j ${m}m`;
  }, [data]);

  const tzNow = new Date(
    now.toLocaleString("en-US", { timeZone: workSettings?.timezone || "Asia/Dubai" })
  );
  const jsDay = tzNow.getDay(); // 0=Min..6=Sab
  const isWeekend = jsDay === 0 || jsDay === 6;
  const statusDetail = isWeekend ? "Libur Akhir Pekan" : isHoliday ? "Libur Nasional" : "Hari Kerja";
  const statusColor = isWeekend || isHoliday ? "text-blue-600" : "text-green-600";

  const currentTimezone = workSettings?.timezone || "Asia/Dubai";
  const timezoneLabel = currentTimezone === "Asia/Dubai" ? "Dubai" : currentTimezone;

  // ---- RENDER --------------------------------------------------------------

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Absen Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-4">Memuat data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Absen Hari Ini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{fmtDate(now, currentTimezone)}</div>
            <div className="text-lg text-gray-600">
              {fmtTimeOnly(now, currentTimezone)} ({timezoneLabel})
            </div>
          </div>
          <div className="text-center">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor} bg-gray-100`}
            >
              {statusDetail}
            </span>
          </div>
        </div>

        {/* Attendance Status */}
        {!data ? (
          <div className="text-center py-6">
            <div className="text-gray-500 mb-2">Belum ada data absen hari ini</div>
            <div className="text-sm text-gray-400">Silakan lakukan check-in</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Check-in/Check-out Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xs text-green-600 mb-1">Check In</div>
                <div className="text-lg font-semibold text-green-700">
                  {fmtTime(data.check_in_at_utc, data.timezone)}
                </div>
                <div className="text-xs mt-1">
                  {data.check_in_lat && data.check_in_lng ? (
                    <span className={data.within_geofence === false ? "text-orange-600" : "text-green-600"}>
                      {data.within_geofence === false ? "⚠️ Di luar kantor" : "✅ Di dalam kantor"}
                    </span>
                  ) : (
                    "-"
                  )}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-600 mb-1">Check Out</div>
                <div className="text-lg font-semibold text-blue-700">
                  {fmtTime(data.check_out_at_utc, data.timezone)}
                </div>
                <div className="text-xs mt-1">
                  {data.check_out_lat && data.check_out_lng ? (
                    <span className={data.within_geofence === false ? "text-orange-600" : "text-green-600"}>
                      {data.within_geofence === false ? "⚠️ Di luar kantor" : "✅ Di dalam kantor"}
                    </span>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </div>

            {/* Work Summary */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Total Kerja</div>
                  <div className="text-lg font-semibold text-gray-800">{workHours}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Keterlambatan</div>
                  <div
                    className={`text-lg font-semibold ${
                      data.minutes_late > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {data.minutes_late > 0 ? `${data.minutes_late}m` : "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Overtime Information */}
            {overtimeData && overtimeData.overtime_minutes > 0 && (
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xs text-orange-700 mb-1 font-medium">Overtime</div>
                    <div className="text-lg font-semibold text-orange-800">
                      {Math.floor(overtimeData.overtime_minutes / 60)}j {overtimeData.overtime_minutes % 60}m
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-orange-700 mb-1 font-medium">Status</div>
                    <div
                      className={`text-sm font-medium ${
                        overtimeData.overtime_approved ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      {overtimeData.overtime_approved ? "Approved" : "Pending"}
                    </div>
                  </div>
                </div>
                {overtimeData.overtime_amount && overtimeData.overtime_amount > 0 && (
                  <div className="mt-2 text-center">
                    <div className="text-xs text-orange-600 mb-1">Gaji Overtime</div>
                    <div className="text-sm font-semibold text-orange-800">
                      {new Intl.NumberFormat("en-AE", {
                        style: "currency",
                        currency: "AED",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(overtimeData.overtime_amount)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Employee Note */}
            {data.employee_note?.trim() && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-yellow-700 mb-1 font-medium">Catatan</div>
                <div className="text-sm text-yellow-800">{data.employee_note}</div>
              </div>
            )}

            {/* System Note (Geofence Warning) */}
            {data.note?.trim() && (
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-xs text-orange-700 mb-1 font-medium">⚠️ Peringatan Sistem</div>
                <div className="text-sm text-orange-800">{data.note}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
