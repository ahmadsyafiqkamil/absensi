import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format work hours from minutes to human-readable format
 * @param minutes - Total minutes
 * @param useIndonesian - Whether to use Indonesian format (j for jam) or English (h for hours)
 * @returns Formatted string like "6h 30m" or "6j 30m"
 */
export function formatWorkHours(minutes: number, useIndonesian: boolean = false): string {
  if (!minutes || minutes <= 0) return '-';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  // Handle edge case where minutes rounds up to 60
  if (mins === 60) {
    const hourSymbol = useIndonesian ? 'j' : 'h';
    return `${hours + 1}${hourSymbol} 0m`;
  }
  
  const hourSymbol = useIndonesian ? 'j' : 'h';
  
  // Format based on whether we have hours and/or minutes
  if (hours > 0 && mins > 0) {
    return `${hours}${hourSymbol} ${mins}m`;
  } else if (hours > 0) {
    return `${hours}${hourSymbol}`;
  } else if (mins > 0) {
    return `${mins}m`;
  } else {
    return '0m';
  }
}

/**
 * Format work hours for Indonesian locale (using 'j' for jam)
 */
export function formatWorkHoursID(minutes: number): string {
  return formatWorkHours(minutes, true);
}

/**
 * Format work hours for English locale (using 'h' for hours)
 */
export function formatWorkHoursEN(minutes: number): string {
  return formatWorkHours(minutes, false);
}
