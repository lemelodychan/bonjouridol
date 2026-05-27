import dns from 'node:dns/promises'
import net from 'node:net'

// Throws if `raw` is not a safe outbound target for a server-side fetch of a
// caller-supplied URL. Guards against SSRF: only http/https, and the resolved
// IP(s) must not fall in loopback / private / link-local / unique-local ranges.
export async function assertSafeUrl(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed')
  }

  const hostname = url.hostname

  // If the host is already a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error('URL resolves to a blocked address')
    return
  }

  let records
  try {
    records = await dns.lookup(hostname, { all: true })
  } catch {
    throw new Error('Could not resolve host')
  }

  if (!records.length) throw new Error('Could not resolve host')

  for (const { address } of records) {
    if (isBlockedIp(address)) {
      throw new Error('URL resolves to a blocked address')
    }
  }
}

function isBlockedIp(ip) {
  const type = net.isIP(ip)
  if (type === 4) return isBlockedIpv4(ip)
  if (type === 6) return isBlockedIpv6(ip)
  return true // not a parseable IP -> block
}

function isBlockedIpv4(ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return true
  const [a, b] = parts
  if (a === 0) return true                         // 0.0.0.0/8
  if (a === 10) return true                        // 10.0.0.0/8 private
  if (a === 127) return true                       // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true          // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true          // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGNAT
  if (a >= 224) return true                        // 224+ multicast / reserved
  return false
}

function isBlockedIpv6(ip) {
  const addr = ip.toLowerCase().split('%')[0] // strip zone id

  if (addr === '::1' || addr === '::') return true // loopback / unspecified

  // IPv4-mapped (::ffff:a.b.c.d) -> validate the embedded v4 address.
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (mapped) return isBlockedIpv4(mapped[1])

  if (addr.startsWith('fe80')) return true // link-local
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true // fc00::/7 unique-local
  if (addr.startsWith('ff')) return true // multicast

  return false
}
