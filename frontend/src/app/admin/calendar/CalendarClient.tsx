"use client";

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Holiday = { id: number; date: string; note?: string }

function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function CalendarClient() {
  const today = new Date()
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1))
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const resp = await fetch('/api/admin/settings/holidays')
      const data = await resp.json().catch(() => ({}))
      setHolidays(data?.results ?? [])
      setLoading(false)
    })()
  }, [])

  const byDate = useMemo(() => {
    const map = new Map<string, Holiday>()
    for (const h of holidays) map.set(h.date, h)
    return map
  }, [holidays])

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor])

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
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((d) => (
              <div key={d} className="text-xs text-gray-500 p-2 text-center">{d}</div>
            ))}
            {grid.map((cell, idx) => {
              const dateStr = toISODate(cell.date)
              const holiday = byDate.get(dateStr)
              const isCurrentMonth = cell.inCurrent
              const isToday = sameDate(cell.date, today)
              return (
                <div
                  key={idx}
                  className={`p-2 h-24 border rounded ${isCurrentMonth ? '' : 'bg-gray-50'} ${holiday ? 'bg-red-50 border-red-200' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-700'}`}>{cell.date.getDate()}</span>
                    {holiday && <span className="text-[10px] text-red-600">Libur</span>}
                  </div>
                  {holiday && (
                    <div className="mt-1 text-[11px] text-red-700 line-clamp-3">{holiday.note || 'Hari Libur'}</div>
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


