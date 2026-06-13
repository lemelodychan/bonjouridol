/** Umami Cloud website ID (matches UmamiTracker script). */
export const UMAMI_WEBSITE_ID = 'f092e573-6aba-45f6-af52-71e7d3c51bd0'

/** Umami Cloud API base URL. Set UMAMI_API_REGION=eu or us if needed. */
export function getUmamiApiBase() {
  const region = process.env.UMAMI_API_REGION?.trim().toLowerCase()
  if (region === 'eu' || region === 'us') {
    return `https://api.umami.is/v1/${region}`
  }
  return 'https://api.umami.is/v1'
}

export function getUmamiApiKey() {
  const key = process.env.UMAMI_API_SECRET?.trim()
  return key || null
}

/** Headers for Umami Cloud API (uses x-umami-api-key, not Bearer auth). */
export function getUmamiHeaders() {
  const apiKey = getUmamiApiKey()
  if (!apiKey) return null
  return {
    Accept: 'application/json',
    'x-umami-api-key': apiKey,
  }
}

export function parseUmamiErrorBody(text) {
  try {
    const parsed = JSON.parse(text)
    return parsed.error?.message || parsed.message || text
  } catch {
    return text
  }
}
