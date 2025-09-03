import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get access token from cookies
    const accessToken = (await cookies()).get('access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    // Get form data from request
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

    // Forward request to backend with authentication
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const backendResponse = await fetch(`${backendUrl}/api/overtime-requests/upload-monthly-export-template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    })

    const backendData = await backendResponse.json()

    if (!backendResponse.ok) {
      return NextResponse.json(backendData, { status: backendResponse.status })
    }

    return NextResponse.json(backendData)

  } catch (error) {
    console.error('Error uploading monthly export template:', error)
    return NextResponse.json(
      { detail: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
