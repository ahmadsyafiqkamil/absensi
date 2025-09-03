import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const url = `${backend}/api/overtime-requests/preview_template/`
    
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

    // Get the document content
    const docBuffer = await resp.arrayBuffer()
    
    // Return document with proper headers
    return new NextResponse(docBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Preview_Template_Overtime.docx"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error in overtime template preview API:', error)
    return NextResponse.json(
      { detail: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
