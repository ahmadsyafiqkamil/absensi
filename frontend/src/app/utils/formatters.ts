/**
 * Format work hours from minutes to HH:MM format
 */
export function formatWorkHours(minutes: number): string {
  if (!minutes || minutes <= 0) return '00:00'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number): string {
  if (amount === 0) return 'Rp 0'
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date to Indonesian format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format time to HH:MM format
 */
export function formatTime(timeString: string): string {
  if (!timeString) return '--:--'
  
  const date = new Date(timeString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Format time with seconds
 */
export function formatTimeWithSeconds(timeString: string): string {
  if (!timeString) return '--:--:--'
  
  const date = new Date(timeString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Get Indonesian weekday name
 */
export function getIndonesianWeekday(weekday: number): string {
  const weekdays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
  return weekdays[weekday] || 'Unknown'
}

/**
 * Format duration from minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 jam'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins} menit`
  } else if (mins === 0) {
    return `${hours} jam`
  } else {
    return `${hours} jam ${mins} menit`
  }
}
