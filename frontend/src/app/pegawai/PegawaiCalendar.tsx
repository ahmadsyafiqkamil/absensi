"use client";

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type AttendanceItem = {
  id: number
  date_local: string
  check_in_at_utc?: string | null
  check_out_at_utc?: string | null
  note?: string | null
}

type AttendanceResponse = {
  count: number
  next: string | null
  previous: string | null
  results: AttendanceItem[]
}

type Holiday = { id: number; date: string; note?: string }

export default function PegawaiCalendar() {
  const today = new Date()
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1))
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<AttendanceItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])

  const monthRange = useMemo(() => getMonthDateRange(cursor), [cursor])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const q = `?start=${monthRange.start}&end=${monthRange.end}`
        const [attResp, holResp] = await Promise.all([
          fetch(`/api/v2/attendance/attendance/${q}`, { cache: 'no-store' }),
          fetch(`/api/v2/settings/holidays/${q}`, { cache: 'no-store' }),
        ])
        const attData: AttendanceResponse | any = await attResp.json().catch(() => ({ results: [] }))
        const holData: { results?: Holiday[] } | any = await holResp.json().catch(() => ({ results: [] }))
        if (!attResp.ok) throw new Error((attData as any)?.detail || 'Gagal memuat data kehadiran')
        if (!holResp.ok) throw new Error((holData as any)?.detail || 'Gagal memuat hari libur')
        setItems(Array.isArray(attData) ? attData : (attData.results || []))
        setHolidays(Array.isArray(holData) ? holData : (holData.results || []))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat data kalender')
      } finally {
        setLoading(false)
      }
    })()
  }, [monthRange.start, monthRange.end])

  const byDate = useMemo(() => {
    const map = new Map<string, { hasIn: boolean; hasOut: boolean; isOffDay: boolean }>()
    for (const it of items) {
      const key = it.date_local
      const isOffDay = (it.note || '').toLowerCase() === 'off-day attendance'.toLowerCase()
      map.set(key, {
        hasIn: !!it.check_in_at_utc,
        hasOut: !!it.check_out_at_utc,
        isOffDay,
      })
    }
    return map
  }, [items])

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor])
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>()
    for (const h of holidays) map.set(h.date, h)
    return map
  }, [holidays])

  return (
    <Card>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="font-semibold">
          {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>Prev</Button>
          <Button variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>Next</Button>
          <Button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</Button>
        </div>
      </div>
      <CardContent>
        {loading ? (
          <div className="text-gray-600">Memuat kalender...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((d) => (
              <div key={d} className="text-xs text-gray-500 p-2 text-center">{d}</div>
            ))}
            {grid.map((cell, idx) => {
              const dateStr = toISODate(cell.date)
              const att = byDate.get(dateStr)
              const isCurrentMonth = cell.inCurrent
              const isToday = sameDate(cell.date, today)
              const hasIn = att?.hasIn
              const hasOut = att?.hasOut
              const isHoliday = holidayMap.has(dateStr)
              const holiday = holidayMap.get(dateStr)
              const isOffDay = !!att?.isOffDay
              const jsDay = cell.date.getDay() // 0=Sun..6=Sat
              const isWeekend = jsDay === 0 || jsDay === 6
              const isHolidayOrWeekend = isHoliday || isWeekend
              const holidayTitle = holiday
                ? (holiday.note || 'Hari Libur')
                : isWeekend
                  ? 'Libur Akhir Pekan'
                  : undefined
              return (
                <div
                  key={idx}
                  className={`p-2 h-24 border rounded ${isCurrentMonth ? '' : 'bg-gray-50'} ${isHolidayOrWeekend ? 'bg-red-50 border-red-200' : isOffDay ? 'bg-amber-50 border-amber-200' : ''}`}
                  title={holidayTitle ?? (isOffDay ? 'Off-day attendance' : undefined)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-700'}`}>{cell.date.getDate()}</span>
                    <div className="flex items-center gap-1">
                      {isHolidayOrWeekend && (
                        <span
                          className="text-[10px] text-red-600 mr-1"
                          title={holidayTitle || 'Hari Libur'}
                        >
                          Libur
                        </span>
                      )}
                      {(!isHoliday && isOffDay) && (
                        <span
                          className="text-[10px] text-amber-600 mr-1"
                          title="Off-day attendance"
                        >
                          Off-day
                        </span>
                      )}
                      {hasIn && <span className="inline-block w-2 h-2 rounded-full bg-green-600" title="Check-in" />}
                      {hasOut && <span className="inline-block w-2 h-2 rounded-full bg-indigo-600" title="Check-out" />}
                    </div>
                  </div>
                  {hasIn || hasOut ? (
                    <div className="mt-1 text-[11px] text-gray-700">
                      {hasIn && <span className="mr-2">Masuk</span>}
                      {hasOut && <span>Pulang</span>}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] text-gray-400">-</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getMonthDateRange(d: Date) {
  const y = d.getFullYear()
  const m = d.getMonth()
  const startDate = new Date(y, m, 1)
  const endDate = new Date(y, m + 1, 0)
  return { start: toISODate(startDate), end: toISODate(endDate) }
}

function buildMonthGrid(cursor: Date) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startWeekday = normalizeWeekday(first.getDay()) // 0=Mon..6=Sun
  const start = new Date(year, month, 1 - startWeekday)
  const cells: { date: Date; inCurrent: boolean }[] = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({ date: d, inCurrent: d.getMonth() === month })
  }
  return cells
}

function normalizeWeekday(jsDay: number) {
  // JS: 0=Sun..6=Sat -> Want: 0=Mon..6=Sun
  return (jsDay + 6) % 7
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}


