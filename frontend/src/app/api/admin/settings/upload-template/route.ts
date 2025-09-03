import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const templateFile = formData.get('template') as File
    
    if (!templateFile) {
      return NextResponse.json({ detail: 'Template file tidak ditemukan' }, { status: 400 })
    }

    // Validate file type
    if (!templateFile.name.endsWith('.docx')) {
      return NextResponse.json({ detail: 'File harus berformat .docx' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (templateFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ detail: 'Ukuran file maksimal 10MB' }, { status: 400 })
    }

    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const url = `${backend}/api/overtime-requests/upload_template/`
    
    // Convert File to FormData for backend
    const backendFormData = new FormData()
    backendFormData.append('template', templateFile)
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: backendFormData,
    })

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}))
      return NextResponse.json(errorData, { status: resp.status })
    }

    const data = await resp.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in template upload API:', error)
    return NextResponse.json(
      { detail: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
