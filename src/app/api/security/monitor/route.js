import { NextResponse } from 'next/server'

// In production, store this in a database or Redis
let securityLogs = []
let blockedIPs = new Set()

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  // Basic authentication (in production, use proper auth)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SECURITY_MONITOR_TOKEN || 'dev-token'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  switch (action) {
    case 'logs':
      return NextResponse.json({
        logs: securityLogs.slice(-100), // Last 100 entries
        total: securityLogs.length
      })
      
    case 'blocked':
      return NextResponse.json({
        blockedIPs: Array.from(blockedIPs),
        count: blockedIPs.size
      })
      
    case 'stats':
      const now = Date.now()
      const last24h = securityLogs.filter(log => 
        new Date(log.timestamp).getTime() > now - 24 * 60 * 60 * 1000
      )
      
      const stats = {
        last24h: {
          total: last24h.length,
          bots: last24h.filter(log => log.reason === 'bot_detected').length,
          rateLimited: last24h.filter(log => log.reason === 'rate_limit').length,
          suspiciousPaths: last24h.filter(log => log.reason === 'suspicious_path').length,
          noUserAgent: last24h.filter(log => log.reason === 'no_user_agent').length,
        },
        topIPs: getTopIPs(last24h, 10),
        topPaths: getTopPaths(last24h, 10),
        topUserAgents: getTopUserAgents(last24h, 10)
      }
      
      return NextResponse.json(stats)
      
    case 'clear':
      securityLogs = []
      blockedIPs.clear()
      return NextResponse.json({ message: 'Logs cleared' })
      
    default:
      return NextResponse.json({ 
        availableActions: ['logs', 'blocked', 'stats', 'clear'],
        usage: 'Add ?action=logs|blocked|stats|clear to the URL'
      })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    
    // Log security events from middleware
    if (data.type === 'security_event') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        ip: data.ip,
        userAgent: data.userAgent,
        pathname: data.pathname,
        reason: data.reason,
        blocked: data.blocked || false
      }
      
      securityLogs.push(logEntry)
      
      // Keep only last 1000 entries
      if (securityLogs.length > 1000) {
        securityLogs = securityLogs.slice(-1000)
      }
      
      // Add to blocked IPs if blocked
      if (data.blocked) {
        blockedIPs.add(data.ip)
      }
      
      return NextResponse.json({ logged: true })
    }
    
    return NextResponse.json({ error: 'Invalid data type' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}

function getTopIPs(logs, limit) {
  const ipCounts = {}
  logs.forEach(log => {
    ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1
  })
  
  return Object.entries(ipCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([ip, count]) => ({ ip, count }))
}

function getTopPaths(logs, limit) {
  const pathCounts = {}
  logs.forEach(log => {
    pathCounts[log.pathname] = (pathCounts[log.pathname] || 0) + 1
  })
  
  return Object.entries(pathCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([path, count]) => ({ path, count }))
}

function getTopUserAgents(logs, limit) {
  const uaCounts = {}
  logs.forEach(log => {
    const ua = log.userAgent || 'Unknown'
    uaCounts[ua] = (uaCounts[ua] || 0) + 1
  })
  
  return Object.entries(uaCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([userAgent, count]) => ({ userAgent, count }))
}
