import { NextResponse } from 'next/server'

// Returns the caller's apparent IP, used only to self-exclude the owner from
// Umami analytics. These forwarding headers are client-spoofable and must
// NEVER be used for authentication, authorization, or rate-limit trust.
export async function GET(request) {
  try {
    // Get client IP from headers
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    
    // Use the first available IP address
    const ip = forwarded?.split(',')[0] || realIP || cfConnectingIP || 'unknown'
    
    return NextResponse.json({ ip })
  } catch (error) {
    console.error('Error getting client IP:', error)
    return NextResponse.json({ ip: 'unknown' })
  }
}
