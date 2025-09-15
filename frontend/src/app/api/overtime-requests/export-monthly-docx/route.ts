import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backend = getBackendUrl()
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = `${backend}/api/overtime-requests/export_monthly_docx/?${queryString}`
    
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      cache: 'no-store'
    })

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}))
      return NextResponse.json(errorData, { status: resp.status })
    }

    // Get the DOCX content
    const docxBuffer = await resp.arrayBuffer()
    
    // Get filename from response headers if available
    const contentDisposition = resp.headers.get('content-disposition')
    let filename = 'laporan-overtime-bulanan.docx'
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }
    
    // Return DOCX with proper headers
    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error in overtime monthly DOCX export API:', error)
    return NextResponse.json(
      { detail: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
