import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const headersList = await headers()
    
    // Try multiple headers for IP detection
    const xForwardedFor = headersList.get('x-forwarded-for')
    const xRealIp = headersList.get('x-real-ip')
    const cfConnectingIp = headersList.get('cf-connecting-ip')
    const xClientIp = headersList.get('x-client-ip')
    const host = headersList.get('host')
    const userAgent = headersList.get('user-agent')
    
    let clientIP = 'unknown'
    let detectionMethod = 'none'
    
    // Priority order for IP detection
    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      clientIP = xForwardedFor.split(',')[0].trim()
      detectionMethod = 'x-forwarded-for'
    } else if (xRealIp) {
      clientIP = xRealIp
      detectionMethod = 'x-real-ip'
    } else if (cfConnectingIp) {
      clientIP = cfConnectingIp
      detectionMethod = 'cf-connecting-ip'
    } else if (xClientIp) {
      clientIP = xClientIp
      detectionMethod = 'x-client-ip'
    }
    
    // Validate IP format
    if (clientIP && clientIP !== 'unknown') {
      // Basic IP validation
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
      if (!ipRegex.test(clientIP)) {
        clientIP = 'invalid-format'
        detectionMethod = 'invalid'
      }
    }
    
    // Additional debugging info
    const debugInfo = {
      detectedIP: clientIP,
      method: detectionMethod,
      headers: {
        xForwardedFor: xForwardedFor || null,
        xRealIp: xRealIp || null,
        cfConnectingIp: cfConnectingIp || null,
        xClientIp: xClientIp || null,
        host: host || null,
        userAgent: userAgent ? userAgent.substring(0, 100) + '...' : null
      }
    }
    
    console.log('IP Detection Debug:', debugInfo)
    
    return NextResponse.json({ 
      ip: clientIP,
      method: detectionMethod,
      debug: debugInfo
    })
  } catch (error) {
    console.error('Error detecting IP:', error)
    return NextResponse.json({ 
      ip: 'error',
      method: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
