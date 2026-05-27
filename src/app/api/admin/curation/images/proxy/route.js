import { NextResponse } from 'next/server'
import { assertSafeUrl } from '@/lib/ssrf'

// NOTE: This route is intentionally NOT behind requireAdmin. It is consumed via
// browser-native <img src> and <a href download> in the curation queue, which
// cannot attach an Authorization header. The real risk (reaching internal
// resources) is closed by the SSRF guard below; we also reject non-image
// upstream responses to limit open-proxy misuse.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const imageUrl   = searchParams.get('url')
  const asDownload = searchParams.get('download') === '1'

  if (!imageUrl) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  let parsed
  try { parsed = new URL(imageUrl) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 })
  }
  try {
    await assertSafeUrl(imageUrl)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Blocked URL' }, { status: 400 })
  }

  let imgRes
  try {
    imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BonjourIdolBot/1.0; +https://bonjouridol.com)',
        'Referer':    parsed.origin + '/',
        'Accept':     'image/*,*/*',
      },
      signal: AbortSignal.timeout(15000),
    })
  } catch (e) {
    return NextResponse.json({ error: `Fetch error: ${e.message}` }, { status: 502 })
  }

  if (!imgRes.ok) {
    return NextResponse.json({ error: `Upstream ${imgRes.status}` }, { status: 502 })
  }

  const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Upstream is not an image' }, { status: 400 })
  }
  const buffer = await imgRes.arrayBuffer()
  const filename = parsed.pathname.split('/').pop()?.split('?')[0] || 'image.jpg'

  const headers = {
    'Content-Type':  contentType,
    'Cache-Control': 'private, max-age=3600',
  }
  if (asDownload) {
    headers['Content-Disposition'] = `attachment; filename="${filename}"`
  }

  return new NextResponse(buffer, { headers })
}
