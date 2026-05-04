import { Actor } from 'apify'

// Twitter's public web-app bearer token.
// If you start getting 401s, find the current value by opening twitter.com in DevTools
// → Network → any request to api.twitter.com → Authorization header → copy the "Bearer ..." value.
// Store it as an Apify secret named TWITTER_BEARER_TOKEN.
const BEARER = process.env.TWITTER_BEARER_TOKEN

async function getGuestToken() {
  const res = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
    method: 'POST',
    headers: { Authorization: `Bearer ${BEARER}` },
  })
  if (!res.ok) throw new Error(`Guest token request failed: ${res.status}`)
  const { guest_token } = await res.json()
  if (!guest_token) throw new Error('Twitter did not return a guest token')
  return guest_token
}

async function fetchTimeline(handle, guestToken, count) {
  const qs = new URLSearchParams({
    screen_name:     handle,
    count:           String(count),
    tweet_mode:      'extended',
    exclude_replies: 'true',
    include_rts:     'false',
  })
  const res = await fetch(
    `https://api.twitter.com/1.1/statuses/user_timeline.json?${qs}`,
    {
      headers: {
        Authorization:   `Bearer ${BEARER}`,
        'x-guest-token': guestToken,
      },
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} — ${body.slice(0, 120)}`)
  }
  return res.json()
}

function extractMedia(tweet) {
  const media = tweet.extended_entities?.media || tweet.entities?.media || []
  return media
    .filter(m => m.type === 'photo')
    .map(m => m.media_url_https || m.media_url)
    .filter(Boolean)
}

Actor.main(async () => {
  if (!BEARER) throw new Error('TWITTER_BEARER_TOKEN secret is not set')

  const { handles = [], maxTweetsPerHandle = 10 } = await Actor.getInput()
  if (!handles.length) return

  const guestToken = await getGuestToken()

  // Fetch all handles in parallel — pure HTTP so no browser concurrency concerns
  await Promise.all(handles.map(async (raw) => {
    const handle = raw.replace(/^@/, '')
    try {
      const tweets = await fetchTimeline(handle, guestToken, maxTweetsPerHandle)
      await Promise.all(tweets.map(t => Actor.pushData({
        handle:    handle.toLowerCase(),
        id:        t.id_str,
        text:      t.full_text || t.text,
        createdAt: t.created_at,
        url:       `https://x.com/${handle}/status/${t.id_str}`,
        mediaUrls: extractMedia(t),
        isReply:   !!t.in_reply_to_status_id_str,
      })))
    } catch (err) {
      console.error(`@${handle}: ${err.message}`)
      await Actor.pushData({ handle: handle.toLowerCase(), error: err.message })
    }
  }))
})
