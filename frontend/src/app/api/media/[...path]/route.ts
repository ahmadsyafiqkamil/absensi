import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
	try {
		const { path } = await params
		const raw = path || []
		if (raw.length === 0) {
			return NextResponse.json({ detail: 'media path required' }, { status: 400 })
		}
		// Normalize: ensure path starts with media/
		const parts = [...raw]
		if (parts[0] === 'media') parts.shift()
		const encoded = parts.map(encodeURIComponent).join('/')
		const safePath = `media/${encoded}`

		const backendBase = getBackendUrl()
		const url = `${backendBase}/${safePath}`

		const resp = await fetch(url, { cache: 'no-store' })
		if (!resp.ok) {
			return NextResponse.json({ detail: 'not found' }, { status: resp.status })
		}

		// Stream the response and preserve important headers
		const headers = new Headers()
		const contentType = resp.headers.get('content-type')
		if (contentType) headers.set('content-type', contentType)
		const disposition = resp.headers.get('content-disposition')
		if (disposition) headers.set('content-disposition', disposition)
		const contentLength = resp.headers.get('content-length')
		if (contentLength) headers.set('content-length', contentLength)

		return new Response(resp.body, { status: 200, headers })
	} catch (e) {
		return NextResponse.json({ detail: 'internal error' }, { status: 500 })
	}
}
