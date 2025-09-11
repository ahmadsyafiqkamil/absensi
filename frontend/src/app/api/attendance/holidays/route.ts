import { NextRequest } from 'next/server'
import { getFromV2Api } from '@/lib/v2-route-helper'

export async function GET(request: NextRequest) {
  // Use v2 API helper for holidays
  return getFromV2Api(request, '/settings/holidays', true)
}



