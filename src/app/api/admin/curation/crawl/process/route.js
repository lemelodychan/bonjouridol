import { NextResponse } from 'next/server'

// Stub — implemented in Phase 3 when the OpenAI pipeline is built.
// The GitHub Actions workflow calls this as Step 2 after /crawl/fetch.
export async function POST() {
  return NextResponse.json(
    { error: 'AI processing not yet configured. Available in Phase 3.' },
    { status: 503 }
  )
}
