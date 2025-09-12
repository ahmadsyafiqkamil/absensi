import { NextRequest } from 'next/server'
import { getFromV2Api } from '@/lib/v2-route-helper'

export async function GET(request: NextRequest) {
  // Use v2 API helper for work settings (corrected endpoint)
  return getFromV2Api(request, '/settings/work', true)
}
