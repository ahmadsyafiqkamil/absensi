/**
 * Enhanced error handling utilities for API calls
 */

import { extractErrorMessage, isAuthError } from './authFetch';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public url: string;
  public method: string;
  public timestamp: string;
  public isAuthError: boolean;
  public originalResponse?: Response;

  constructor(
    message: string,
    status: number,
    statusText: string,
    url: string,
    method: string,
    originalResponse?: Response
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.method = method;
    this.timestamp = new Date().toISOString();
    this.isAuthError = isAuthError({ status } as Response);
    this.originalResponse = originalResponse;
  }
}

/**
 * Handle API response errors consistently
 */
export async function handleApiResponse(response: Response, url: string, method: string): Promise<Response> {
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new ApiError(
      errorMessage,
      response.status,
      response.statusText,
      url,
      method,
      response
    );
  }

  return response;
}

/**
 * Handle API errors with user-friendly messages
 */
export function handleApiError(error: unknown): {
  userMessage: string;
  technicalMessage: string;
  shouldRetry: boolean;
  shouldLogout: boolean;
} {
  // Handle our custom ApiError
  if (error instanceof ApiError) {
    const userMessage = getUserFriendlyMessage(error);
    const technicalMessage = error.message;
    const shouldRetry = shouldRetryRequest(error);
    const shouldLogout = error.isAuthError;

    return {
      userMessage,
      technicalMessage,
      shouldRetry,
      shouldLogout,
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      userMessage: 'Terjadi kesalahan tak terduga. Silakan coba lagi.',
      technicalMessage: error.message,
      shouldRetry: true,
      shouldLogout: false,
    };
  }

  // Handle unknown errors
  return {
    userMessage: 'Terjadi kesalahan yang tidak diketahui.',
    technicalMessage: String(error),
    shouldRetry: false,
    shouldLogout: false,
  };
}

/**
 * Convert technical errors to user-friendly messages
 */
function getUserFriendlyMessage(error: ApiError): string {
  switch (error.status) {
    case 400:
      return 'Data yang dimasukkan tidak valid. Silakan periksa dan coba lagi.';
    case 401:
      return 'Sesi Anda telah berakhir. Silakan login kembali.';
    case 403:
      return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
    case 404:
      return 'Data yang dicari tidak ditemukan.';
    case 409:
      return 'Data sudah ada atau terjadi konflik. Silakan periksa kembali.';
    case 422:
      return 'Data tidak dapat diproses. Silakan periksa format data.';
    case 429:
      return 'Terlalu banyak permintaan. Silakan tunggu sebentar dan coba lagi.';
    case 500:
      return 'Terjadi kesalahan di server. Silakan coba lagi nanti.';
    case 502:
    case 503:
    case 504:
      return 'Server sedang tidak dapat diakses. Silakan coba lagi nanti.';
    default:
      if (error.status >= 500) {
        return 'Terjadi kesalahan di server. Silakan coba lagi nanti.';
      }
      return 'Terjadi kesalahan. Silakan coba lagi.';
  }
}

/**
 * Determine if a request should be retried
 */
function shouldRetryRequest(error: ApiError): boolean {
  // Don't retry authentication errors
  if (error.isAuthError) return false;

  // Don't retry client errors (4xx) except for specific cases
  if (error.status >= 400 && error.status < 500) {
    return error.status === 408 || error.status === 429; // Request timeout or rate limit
  }

  // Retry server errors (5xx) and network errors
  return error.status >= 500 || error.status === 0;
}

/**
 * Log errors for debugging
 */
export function logApiError(error: unknown, context?: string): void {
  const contextPrefix = context ? `[${context}] ` : '';

  if (error instanceof ApiError) {
    console.error(`${contextPrefix}API Error:`, {
      message: error.message,
      status: error.status,
      url: error.url,
      method: error.method,
      isAuthError: error.isAuthError,
      timestamp: error.timestamp,
    });
  } else {
    console.error(`${contextPrefix}Unknown Error:`, error);
  }
}

/**
 * Show user-friendly error notification
 */
export function showErrorNotification(error: unknown, context?: string): void {
  const { userMessage } = handleApiError(error);
  logApiError(error, context);

  // In a real app, you might use a toast notification library here
  console.warn(`User Error: ${userMessage}`);

  // You can integrate with your preferred notification system here
  // Example: toast.error(userMessage);
}
