import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    // Get all possible IP headers
    const headers = {
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
      'x-client-ip': request.headers.get('x-client-ip'),
      'x-forwarded': request.headers.get('x-forwarded'),
      'forwarded-for': request.headers.get('forwarded-for'),
      'forwarded': request.headers.get('forwarded'),
    }
    
    // Get environment variable
    const excludedIPs = process.env.NEXT_PUBLIC_UMAMI_EXCLUDED_IPS
    
    // Determine the actual client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    const clientIP = forwarded?.split(',')[0] || realIP || cfConnectingIP || 'unknown'
    
    return NextResponse.json({
      clientIP,
      excludedIPs,
      allHeaders: headers,
      shouldDisable: excludedIPs?.includes(clientIP) || false
    })
  } catch (error) {
    return NextResponse.json({ error: error.message })
  }
}
