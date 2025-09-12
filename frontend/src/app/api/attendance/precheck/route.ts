import { NextRequest } from 'next/server'
import { postToV2Api } from '@/lib/v2-route-helper'

export async function POST(request: NextRequest) {
  // Use v2 API helper for attendance precheck
  return postToV2Api(request, '/attendance/attendance/precheck/')
}


