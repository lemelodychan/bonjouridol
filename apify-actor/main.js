import { Actor } from 'apify'

async function getGuestToken(bearer) {
  const res = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearer}` },
  })
  if (!res.ok) throw new Error(`Guest token request failed: ${res.status}`)
  const { guest_token } = await res.json()
  if (!guest_token) throw new Error('Twitter did not return a guest token')
  return guest_token
}

async function fetchTimeline(handle, bearer, guestToken, count) {
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
        Authorization:   `Bearer ${bearer}`,
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
  const { handles = [], maxTweetsPerHandle = 10, bearerToken } = await Actor.getInput()
  if (!bearerToken) throw new Error('bearerToken input is required')
  if (!handles.length) return

  const guestToken = await getGuestToken(bearerToken)

  // Fetch all handles in parallel — pure HTTP so no browser concurrency concerns
  await Promise.all(handles.map(async (raw) => {
    const handle = raw.replace(/^@/, '')
    try {
      const tweets = await fetchTimeline(handle, bearerToken, guestToken, maxTweetsPerHandle)
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
