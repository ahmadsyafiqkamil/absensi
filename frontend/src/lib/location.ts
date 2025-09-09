export interface LocationData {
  lat: number
  lng: number
  acc: number
  timestamp: number
}

export interface LocationError {
  code: number
  message: string
  details?: string
}

export class LocationService {
  private static instance: LocationService
  private locationCache: LocationData | null = null
  private cacheExpiry = 5 * 60 * 1000 // 5 minutes

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService()
    }
    return LocationService.instance
  }

  /**
   * Get current location with improved error handling
   */
  async getCurrentLocation(options?: PositionOptions): Promise<LocationData> {
    // Check if geolocation is supported
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation tidak didukung browser ini')
    }

    // Check if we have a valid cached location
    if (this.locationCache && (Date.now() - this.locationCache.timestamp) < this.cacheExpiry) {
      console.log('Using cached location:', this.locationCache)
      return this.locationCache
    }

    // Check if we're on HTTPS (required for geolocation)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      throw new Error('HTTPS diperlukan untuk mengakses lokasi. Gunakan https://absensi.localhost')
    }

    return new Promise<LocationData>((resolve, reject) => {
      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 30000, // 30 seconds
        maximumAge: 0
      }

      const finalOptions = { ...defaultOptions, ...options }

      console.log('Requesting location with options:', finalOptions)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          const locationData: LocationData = {
            lat: Number(latitude.toFixed(6)),
            lng: Number(longitude.toFixed(6)),
            acc: Math.round(accuracy),
            timestamp: Date.now()
          }

          // Cache the location
          this.locationCache = locationData

          console.log('Location obtained successfully:', locationData)
          resolve(locationData)
        },
        (error) => {
          const locationError = this.handleLocationError(error)
          console.error('Location error:', locationError)
          reject(locationError)
        },
        finalOptions
      )
    })
  }

  /**
   * Handle different types of location errors
   */
  private handleLocationError(error: GeolocationPositionError): LocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return {
          code: error.code,
          message: 'Izin lokasi ditolak. Silakan izinkan akses lokasi di browser.',
          details: 'Klik icon lock di address bar dan izinkan lokasi'
        }
      
      case error.POSITION_UNAVAILABLE:
        return {
          code: error.code,
          message: 'Lokasi tidak tersedia. Pastikan GPS aktif dan ada sinyal.',
          details: 'Cek pengaturan GPS device dan koneksi internet'
        }
      
      case error.TIMEOUT:
        return {
          code: error.code,
          message: 'Timeout mengambil lokasi. Coba lagi.',
          details: 'Pastikan ada sinyal GPS yang kuat'
        }
      
      default:
        return {
          code: error.code,
          message: 'Error tidak diketahui saat mengambil lokasi',
          details: error.message
        }
    }
  }

  /**
   * Check if location permission is granted
   */
  async checkPermission(): Promise<PermissionState> {
    if (!('permissions' in navigator)) {
      return 'granted' // Assume granted if permissions API not available
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
      return result.state
    } catch (error) {
      console.warn('Could not check geolocation permission:', error)
      return 'prompt'
    }
  }

  /**
   * Request location permission explicitly
   */
  async requestPermission(): Promise<boolean> {
    try {
      const location = await this.getCurrentLocation({ timeout: 5000 })
      return !!location
    } catch (error) {
      console.warn('Permission request failed:', error)
      return false
    }
  }

  /**
   * Clear cached location
   */
  clearCache(): void {
    this.locationCache = null
  }

  /**
   * Get cached location if available
   */
  getCachedLocation(): LocationData | null {
    if (this.locationCache && (Date.now() - this.locationCache.timestamp) < this.cacheExpiry) {
      return this.locationCache
    }
    return null
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance()
