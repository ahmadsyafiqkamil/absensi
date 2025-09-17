/**
 * Utility functions for formatting data in the application
 */

/**
 * Format work hours from minutes to human-readable format
 * @param minutes - Total minutes
 * @param useIndonesian - Whether to use Indonesian format (j for hours) or English (h for hours)
 * @returns Formatted string like "8j 30m" or "8h 30m"
 */
export function formatWorkHours(minutes: number, useIndonesian: boolean = true): string {
  if (!minutes || minutes <= 0) return '-';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  // Handle edge case where minutes rounds up to 60
  if (mins === 60) {
    return `${hours + 1}${useIndonesian ? 'j' : 'h'}`;
  }
  
  const hourSymbol = useIndonesian ? 'j' : 'h';
  
  if (hours > 0 && mins > 0) {
    return `${hours}${hourSymbol} ${mins}m`;
  } else if (hours > 0) {
    return `${hours}${hourSymbol}`;
  } else if (mins > 0) {
    return `${mins}m`;
  }
  
  return '0m';
}

/**
 * Format currency amount to Indonesian Rupiah
 * @param amount - Amount in number
 * @returns Formatted currency string like "Rp 1.000.000"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to Indonesian format
 * @param dateString - Date string or Date object
 * @returns Formatted date string like "Senin, 15 Januari 2024"
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time to 24-hour format
 * @param timeString - Time string or Date object
 * @returns Formatted time string like "14:30"
 */
export function formatTime(timeString: string | Date | null): string {
  if (!timeString) return '-';
  
  const date = typeof timeString === 'string' ? new Date(timeString) : timeString;
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format time with seconds
 * @param timeString - Time string or Date object
 * @returns Formatted time string like "14:30:25"
 */
export function formatTimeWithSeconds(timeString: string | Date | null): string {
  if (!timeString) return '-';
  
  const date = typeof timeString === 'string' ? new Date(timeString) : timeString;
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Get weekday name in Indonesian
 * @param date - Date object or date string
 * @returns Weekday name like "Senin", "Selasa", etc.
 */
export function getIndonesianWeekday(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const weekdays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return weekdays[dateObj.getDay()];
}

/**
 * Format duration in a human-readable way
 * @param minutes - Duration in minutes
 * @returns Formatted duration like "2 jam 30 menit"
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours} jam ${mins} menit`;
  } else if (hours > 0) {
    return `${hours} jam`;
  } else if (mins > 0) {
    return `${mins} menit`;
  }
  
  return '0 menit';
}
