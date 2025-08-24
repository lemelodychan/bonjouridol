// Utility for managing redirects from old site to new site
// You can easily update this mapping when you add new articles

export const redirectMapping = {
  // Live Reports
  'iketeru-hearts-final-live': '/articles/iketeru-hearts-final-live-2023',
  'unidol-2021-2022-winter-edition-the-dark-horses-finale': '/articles/220228-unidol-2021-2022-winter-edition',
  'youll-melt-more-kechon-chiffon-graduation': '/articles/youll-melt-more-kechon-chiffon-graduation-2022',
  'equal-love-4th-anniversary-concert': '/articles/211005-equal-love-4th-anniversary-concert',
  'iketeru-hearts-7th-anniversary': '/articles/iketeru-hearts-7th-anniversary-2021',
  
  // Interviews
  'kamieda-emika-interview-part-2': '/articles/interview-with-kamieda-emika-part-2',
  'kamieda-emika-interview-part-1': '/articles/interview-with-kamieda-emika-part-1',
  
  // News & Press Releases
  'one-last-unidol-event-at-usen-studio-coast': '/articles/211020-unidol-usen-studio-coast',
  'unidol-2021-fresh-your-dose-of-vitamins': '/articles/211026-unidol-2021-fresh',
  
  // Discoveries
  'discovery-somosomo': '/articles/discovery-somosomo',
  'summer-idol-songs-2019': '/articles/summer-idol-songs-2019',
  'discovery-festive': '/articles/discovery-festive',
  
  // Bonjour Idol Style
  'neoriyon-2020': '/galleries/200801-neoriyon',
  
  // New redirects from CSV migration
  'ylmlm-younapi-last-live': '/articles/201020-youll-melt-more-younapi-graduation',
  'junjou-afilia-9nin-etranger-prologue-en': '/articles/200725-junjou-no-afilia-oneman-request',
  'equal-love-winter-tour-finale-2019': '/articles/200117-equal-love-2019-20-winter-tour-finale',
  'onepixcel-first-oneman-live-2020': '/articles/200209-onepixcel-one-man',
  'onepixcel-tour-finale-2019': '/articles/190922-onepixcel-tour-finale',
  'akishibu-project-first-concert-2020': '/articles/200216-akishibu-project-one-man-live',
  'tif2019-stu48-en': '/articles/190802-04-tif2019-stu48',
  'tif2019-task-have-fun-en': '/articles/190804-tif2019-task-have-fun',
  'tif2019-equal-love-en': '/articles/190802-04-tif2019-equal-love',
  'tif2019-angerme-beyooooonds-kobushi-factory-en': '/articles/190802-04-tif2019-hello-project',
  'tif2019-wack-en': '/articles/190802-tif2019-wack',
  'tif2019-22-7-en': '/articles/190802-04-tif2019-22-7',
  'tif2019-festive-en': '/articles/190804-tif2019-festive',
  'tif2019-nogizaka46-4th-generation': '/articles/190802-04-tif2019-nogizaka46',
  'tif2019-standup-records-groups': '/articles/190802-04-tif2019-standup-records',
  'tif2019-bnk48-siamdream-en': '/articles/190804-tif2019-bnk48-siamdream',
  'tif2019-akb48-en': '/articles/190802-04-tif2019-akb48',
  'tif2019-ske-nmb-hkt-48-en': '/articles/190802-04-tif2019-48groups',
  'awakoi-tomiyoshi-asuka-first-solo-concert': '/articles/210427-awakoi',
  'banzai-japan-paris-trip-europe': '/articles/180708-banzai-japan-in-paris',
  'milcs-honmono-introduction': '/articles/191006-milcs-honmono-tokyo-one-man',
  'kyueens-encounter-club-malcolm': '/articles/190510-kyueens',
  'notall-tour-finale-chiko-graduation': '/articles/190321-notall-tour-finale',
  'discovery-malcom-mask-mclaren': '/articles/discovery-malcolm-mask-mclaren',
  'discovery-necronomidol': '/articles/discovery-necronomidol',
  'love-japan-expo-2018-interview-fr': '/articles/180705-je-2018-equallove-interview',
  'japan-expo-2018-maneki-kecak-2': '/articles/180705-je-2018-maneki-kecak-interview',
  'kozuki-serena-3rd-live-report': '/articles/160424-kozuki-serenas-3rd-one-man-live',
  'kozuki-serena-6th-oneman': '/articles/171230-kozuki-serena-6th-one-man-live',
  'tokyo-idol-festival-2018-hkt48-en': '/articles/180804-tif2018-hkt48',
  'tokyo-idol-festival-2018-japan-expo-guests': '/articles/180804-tif2018-japan-expo-guests',
  'tokyo-idol-festival-2018-akb48-team8-stu48-bnk48': '/articles/180804-tif2018-akb48-team8-stu48-bnk48',
  
  // Categories
  'live-reports': '/articles',
  'interviews': '/features',
  'news': '/pressrelease',
  'discoveries': '/discoveries',
  'behind-the-scenes': '/features',
  'bonjour-idol-style': '/galleries',
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
