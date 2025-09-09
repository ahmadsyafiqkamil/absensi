/**
 * Centralized error handling utilities for consistent error management
 */

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

/**
 * Parse API error response into a standardized AppError
 */
export function parseApiError(error: any): AppError {
  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
      status: 0,
      details: error
    };
  }

  // Handle AbortError (timeout)
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT_ERROR',
      status: 408,
      details: error
    };
  }

  // Handle standard HTTP errors
  if (error.status) {
    switch (error.status) {
      case 400:
        return {
          message: error.message || 'Bad request. Please check your input.',
          code: 'BAD_REQUEST',
          status: 400,
          details: error
        };
      case 401:
        return {
          message: 'Authentication required. Please log in again.',
          code: 'UNAUTHORIZED',
          status: 401,
          details: error
        };
      case 403:
        return {
          message: 'You do not have permission to perform this action.',
          code: 'FORBIDDEN',
          status: 403,
          details: error
        };
      case 404:
        return {
          message: 'The requested resource was not found.',
          code: 'NOT_FOUND',
          status: 404,
          details: error
        };
      case 422:
        return {
          message: error.message || 'Validation failed. Please check your input.',
          code: 'VALIDATION_ERROR',
          status: 422,
          details: error
        };
      case 500:
        return {
          message: 'Internal server error. Please try again later.',
          code: 'INTERNAL_ERROR',
          status: 500,
          details: error
        };
      default:
        return {
          message: error.message || 'An unexpected error occurred.',
          code: 'UNKNOWN_ERROR',
          status: error.status,
          details: error
        };
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'GENERIC_ERROR',
      status: undefined,
      details: error
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'STRING_ERROR',
      status: undefined,
      details: null
    };
  }

  // Handle unknown errors
  return {
    message: 'An unexpected error occurred.',
    code: 'UNKNOWN_ERROR',
    status: undefined,
    details: error
  };
}

/**
 * Handle API response and return parsed error or data
 */
export async function handleApiResponse<T>(response: Response): Promise<{ data: T | null; error: AppError | null }> {
  try {
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      const error = parseApiError({
        ...errorData,
        status: response.status
      });

      return { data: null, error };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: parseApiError(error) };
  }
}

/**
 * Wrapper for fetch with consistent error handling
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<{ data: any; error: AppError | null }> {
  try {
    const response = await fetch(url, options);
    return await handleApiResponse(response);
  } catch (error) {
    return { data: null, error: parseApiError(error) };
  }
}

/**
 * Log error for debugging purposes
 */
export function logError(error: AppError, context?: string): void {
  const logMessage = {
    timestamp: new Date().toISOString(),
    context,
    error
  };

  console.error('[App Error]', logMessage);

  // In production, you might want to send this to an error tracking service
  // Example: Sentry, LogRocket, etc.
}

/**
 * Create user-friendly error message
 */
export function getErrorMessage(error: AppError): string {
  // You can customize error messages based on error codes
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Connection problem. Please check your internet connection.';
    case 'TIMEOUT_ERROR':
      return 'Request is taking too long. Please try again.';
    case 'UNAUTHORIZED':
      return 'Your session has expired. Please log in again.';
    case 'FORBIDDEN':
      return 'You do not have permission to access this resource.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}
