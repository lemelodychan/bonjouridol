import { assertSafeUrl } from '@/lib/ssrf'

const BUCKET = 'crawl-images'

/**
 * Download each image URL and upload to Supabase Storage under a shared folder.
 * Images are uploaded in parallel. Any individual failure falls back to the original URL.
 * Returns an array of URLs in the same order — Storage URLs where successful, originals otherwise.
 */
export async function uploadItemImages(supabase, folder, imageUrls) {
  return Promise.all(imageUrls.map(async (url, i) => {
    try {
      // Block SSRF: crawled URLs are untrusted — skip internal/private targets.
      await assertSafeUrl(url)
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BonjourIdolBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return url

      const buffer = await res.arrayBuffer()
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.includes('png') ? 'png'
        : contentType.includes('gif') ? 'gif'
        : contentType.includes('webp') ? 'webp'
        : 'jpg'

      const path = `${folder}/${i}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true })
      if (error) return url

      return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    } catch {
      return url
    }
  }))
}

/**
 * Delete all images for a single item by its storage folder.
 * Best-effort — never throws.
 */
export async function deleteItemImages(supabase, folder) {
  try {
    const { data: files } = await supabase.storage.from(BUCKET).list(folder)
    if (files?.length) {
      await supabase.storage.from(BUCKET).remove(files.map(f => `${folder}/${f.name}`))
    }
  } catch { /* best-effort */ }
}

/**
 * Delete all images in the bucket (used on full data wipe).
 * Lists up to 1000 top-level folders and removes all files within them.
 * Best-effort — never throws.
 */
export async function deleteAllImages(supabase) {
  try {
    const { data: folders } = await supabase.storage.from(BUCKET).list('', { limit: 1000 })
    if (!folders?.length) return
    const paths = []
    for (const folder of folders) {
      const { data: files } = await supabase.storage.from(BUCKET).list(folder.name)
      if (files?.length) paths.push(...files.map(f => `${folder.name}/${f.name}`))
    }
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
  } catch { /* best-effort */ }
}
