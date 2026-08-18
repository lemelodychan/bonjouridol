import { createClient } from "@/prismicio";
import { PARTY_INDEXABLE, PARTY_URL } from "@/app/party/config";

export const dynamic = 'force-dynamic'; // Disable caching for sitemap
export const revalidate = 0; // Ensure no caching

export async function GET() {
  const client = createClient();

  // Base URL of your site
  const baseUrl = "https://www.bonjouridol.com";

  // Initialize pages array with static pages
  const pages = [
    { loc: `${baseUrl}/`, lastmod: new Date().toISOString().split('T')[0], changefreq: "daily", priority: 1.0 },
    { loc: `${baseUrl}/livereports`, lastmod: new Date().toISOString().split('T')[0], changefreq: "monthly", priority: 0.8 },
    { loc: `${baseUrl}/interviews`, lastmod: new Date().toISOString().split('T')[0], changefreq: "monthly", priority: 0.8 },
    { loc: `${baseUrl}/features`, lastmod: new Date().toISOString().split('T')[0], changefreq: "monthly", priority: 0.8 },
    { loc: `${baseUrl}/pressrelease`, lastmod: new Date().toISOString().split('T')[0], changefreq: "monthly", priority: 0.8 },
    { loc: `${baseUrl}/galleries`, lastmod: new Date().toISOString().split('T')[0], changefreq: "monthly", priority: 0.8 },
    { loc: `${baseUrl}/about`, lastmod: new Date().toISOString().split('T')[0], changefreq: "monthly", priority: 0.5 },
    { loc: `${baseUrl}/contact`, lastmod: new Date().toISOString().split('T')[0], changefreq: "monthly", priority: 0.3 },
  ];

  // Bonjour Party event page — only advertised once it's public (same flag that
  // controls its noindex tag), so it stays out of the sitemap during soft launch.
  if (PARTY_INDEXABLE) {
    pages.push({ loc: PARTY_URL, lastmod: new Date().toISOString().split('T')[0], changefreq: "daily", priority: 0.9 });
  }

  // Fetch your site data with error handling
  // Use pagination to avoid 2MB cache limit
  try {
    // Fetch articles with pagination (only fetch UIDs and dates to keep response small)
    try {
      let articlePage = 1
      let hasMoreArticles = true
      const articlePageSize = 100
      
      while (hasMoreArticles) {
        const articleResponse = await client.getByType("articles", { 
          page: articlePage,
          pageSize: articlePageSize,
          fetchOptions: {
            cache: 'no-store', // Disable caching for sitemap generation
          },
        });
        
        articleResponse.results.forEach((article) => {
          pages.push({
            loc: `${baseUrl}/articles/${article.uid}`,
            lastmod: new Date(article.last_publication_date || article.first_publication_date || new Date()).toISOString().split('T')[0],
            changefreq: "weekly",
            priority: 0.8,
          });
        });
        
        hasMoreArticles = articlePage < articleResponse.total_pages
        articlePage++
      }
    } catch (error) {
      console.error("Error fetching articles for sitemap:", error.message);
      // Continue without articles if fetch fails
    }

    // Fetch galleries with pagination
    try {
      let galleryPage = 1
      let hasMoreGalleries = true
      const galleryPageSize = 100
      
      while (hasMoreGalleries) {
        const galleryResponse = await client.getByType("gallery", { 
          page: galleryPage,
          pageSize: galleryPageSize,
          fetchOptions: {
            cache: 'no-store', // Disable caching for sitemap generation
          },
        });
        
        galleryResponse.results.forEach((gallery) => {
          pages.push({
            loc: `${baseUrl}/galleries/${gallery.uid}`,
            lastmod: new Date(gallery.last_publication_date || gallery.first_publication_date || new Date()).toISOString().split('T')[0],
            changefreq: "weekly",
            priority: 0.7,
          });
        });
        
        hasMoreGalleries = galleryPage < galleryResponse.total_pages
        galleryPage++
      }
    } catch (error) {
      console.error("Error fetching galleries for sitemap:", error.message);
      // Continue without galleries if fetch fails
    }
  } catch (error) {
    console.error("Error initializing Prismic client for sitemap:", error.message);
    // Continue with static pages only if Prismic fails
  }


  // Build the XML sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${pages
      .map(
        (page) => `
      <url>
        <loc>${page.loc}</loc>
        <lastmod>${page.lastmod}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
      </url>`
      )
      .join('')}
  </urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}