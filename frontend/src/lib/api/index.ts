/**
 * API Client - Main Entry Point
 * Feature-based organization with backward compatibility
 */

// Import feature-based API clients
export { default as authApi } from './auth/client'
export { default as attendanceApi, correctionsApi } from './attendance/client'

// Re-export for backward compatibility
export * from './auth/client'

// Import additional feature APIs as they are created
// export * from './overtime/client'
// export * from './employee/client'
// export * from './settings/client'
// export * from './permissions/client'

// Import legacy API functions for backward compatibility
// These will be gradually migrated to feature-based modules
import * as legacyApi from '../api-legacy'

// Re-export legacy functions to maintain compatibility
export * from '../api-legacy'
