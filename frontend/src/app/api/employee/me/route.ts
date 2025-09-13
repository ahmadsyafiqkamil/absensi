import { NextRequest } from 'next/server'
import { getFromV2Api } from '@/lib/v2-route-helper'

export async function GET(request: NextRequest) {
  // Proxy to v2 employee "me" endpoint (returns current user's employee profile)
  return getFromV2Api(request, '/employees/me', true)
}


