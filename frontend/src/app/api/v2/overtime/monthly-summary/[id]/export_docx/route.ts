import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendBaseUrl } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backend = getBackendBaseUrl()
    const url = `${backend}/api/v2/overtime/monthly-summary/${(await params).id}/export_docx/`

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store'
    })

    const buf = await resp.arrayBuffer()
    const contentType = resp.headers.get('Content-Type') || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const contentDisposition = resp.headers.get('Content-Disposition') || `attachment; filename="rekap_lembur.docx"`

    return new Response(buf, {
      status: resp.status,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      }
    })
  } catch (error) {
    console.error('Error proxying monthly summary export_docx:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}


