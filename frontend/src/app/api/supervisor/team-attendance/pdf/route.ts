import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const employeeId = searchParams.get('employee_id')
  
  const backend = getBackendUrl()
  
  // Build query parameters for backend
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  if (employeeId) params.append('employee_id', employeeId)
  
  // Try main endpoint first
  let url = `${backend}/api/supervisor/team-attendance/pdf?${params.toString()}`
  
  try {
    let response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        // Remove Accept header to let backend decide content type
        'User-Agent': 'Mozilla/5.0 (compatible; AbsensiApp/1.0)'
      },
      cache: 'no-store',
    })
    
    // If main endpoint fails with Accept header error, try alternative
    if (response.status === 406 || response.status === 400) {
      const errorText = await response.text()
      if (errorText.includes('Accept header') || errorText.includes('Could not satisfy')) {
        console.log('Main PDF endpoint failed, trying alternative...')
        url = `${backend}/api/supervisor/team-attendance/pdf-alt?${params.toString()}`
        
        response = await fetch(url, {
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'Mozilla/5.0 (compatible; AbsensiApp/1.0)'
          },
          cache: 'no-store',
        })
      }
    }
    
    if (!response.ok) {
      // Try to get error details
      let errorData = {}
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json()
        } else {
          errorData = { detail: await response.text() }
        }
      } catch {
        errorData = { detail: `HTTP ${response.status}: ${response.statusText}` }
      }
      
      console.error('Backend PDF generation failed:', errorData)
      return NextResponse.json(errorData, { status: response.status })
    }
    
    // Check if response is actually PDF
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/pdf')) {
      console.error('Backend did not return PDF, content-type:', contentType)
      return NextResponse.json({ 
        detail: 'Backend did not return PDF format' 
      }, { status: 500 })
    }
    
    const pdfBuffer = await response.arrayBuffer()
    
    // Create response with PDF content
    const pdfResponse = new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="supervisor-team-attendance-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
    
    return pdfResponse
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ 
      detail: 'Internal server error during PDF generation' 
    }, { status: 500 })
  }
}
