// Utility for managing redirects from old site to new site
// You can easily update this mapping when you add new articles

export const redirectMapping = {
  // Live Reports
  'taking-different-pathways-with-hope-and-love-iketeru-hearts-final-live': '/articles/iketeru-hearts-final-live-2023',
  'unidol-2021-2022-winter-edition-the-dark-horses-finale': '/articles/unidol-2021-2022-winter-finale',
  'dont-stop-youll-melt-more-delivery-lifesavers-tour-tokyo-kechon-chiffon-graduation': '/articles/youll-melt-more-kechon-chiffon-graduation-2022',
  '4-years-already-love-anniversary-concert': '/articles/love-anniversary-concert-2021',
  'seven-years-of-love-iketeru-hearts-7th-anniversary-live': '/articles/iketeru-hearts-7th-anniversary-2021',
  
  // Interviews
  'a-japanese-girl-in-spain-interview-with-kamieda-emika-former-nmb48-part-2': '/articles/kamieda-emika-interview-part-2-2020',
  'a-japanese-girl-in-spain-interview-with-kamieda-emika-former-nmb48-part-1': '/articles/kamieda-emika-interview-part-1-2020',
  
  // News & Press Releases
  'one-last-unidol-event-at-usen-studio-coast': '/articles/unidol-usen-studio-coast-final-2021',
  'unidol-2021-fresh-your-dose-of-vitamins': '/articles/unidol-2021-fresh-event',
  
  // Discoveries
  'discovery-first-contact-with-somosomo': '/articles/somosomo-discovery-2020',
  'beach-watermelons-and-bikini-a-summer-idol-playlist': '/articles/summer-idol-playlist-2019',
  'discovery-festive': '/articles/festive-discovery-2019',
  
  // Bonjour Idol Style
  'neoriyon-stupid-august-2020': '/galleries/200801-neoriyon',
  
  // Categories
  'live-reports': '/articles',
  'interviews': '/articles',
  'news': '/articles',
  'discoveries': '/articles',
  'behind-the-scenes': '/articles',
  'bonjour-idol-style': '/articles',
}

// Function to get redirect destination
export function getRedirectDestination(oldPath) {
  // Clean the path (remove leading slash and .html if present)
  const cleanPath = oldPath.replace(/^\/+/, '').replace(/\.html$/, '')
  return redirectMapping[cleanPath] || null
}

// Function to add a new redirect
export function addRedirect(oldPath, newPath) {
  redirectMapping[oldPath] = newPath
  console.log(`Added redirect: ${oldPath} → ${newPath}`)
}

// Function to remove a redirect
export function removeRedirect(oldPath) {
  if (redirectMapping[oldPath]) {
    delete redirectMapping[oldPath]
    console.log(`Removed redirect: ${oldPath}`)
  }
}

// Function to list all redirects
export function listRedirects() {
  return Object.entries(redirectMapping).map(([oldPath, newPath]) => ({
    from: oldPath,
    to: newPath
  }))
}
