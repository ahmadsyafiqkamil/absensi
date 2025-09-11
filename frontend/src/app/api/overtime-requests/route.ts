import { NextRequest } from 'next/server'
import { getFromV2Api, postToV2Api } from '@/lib/v2-route-helper'

// GET /api/overtime-requests - Get overtime requests (v2)
export async function GET(request: NextRequest) {
  return getFromV2Api(request, '/overtime/overtime', true)
}

// POST /api/overtime-requests - Create overtime request (v2)
export async function POST(request: NextRequest) {
  return postToV2Api(request, '/overtime/overtime', null, true)
}
