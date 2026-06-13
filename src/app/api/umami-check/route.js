import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    // Get client IP from headers
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    // Use the first available IP address
    const clientIP = forwarded?.split(',')[0] || realIP || cfConnectingIP || 'unknown'
    
    // Get excluded IPs from environment variable
    const excludedIPs = (process.env.NEXT_PUBLIC_UMAMI_EXCLUDED_IPS?.split(',') || [])
      .map((ip) => ip.trim())
      .filter(Boolean)

    const shouldDisable = excludedIPs.includes(clientIP)

    if (shouldDisable) {
      console.log('Umami check: IP excluded from tracking:', clientIP)
    }

    return NextResponse.json({ shouldDisable })
  } catch (error) {
    console.error('Error checking Umami exclusion:', error)
    return NextResponse.json({ 
      shouldDisable: false,
      clientIP: 'unknown',
      excludedIPs: []
    })
  }
}
