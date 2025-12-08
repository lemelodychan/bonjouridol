import { createClient } from "@/prismicio";

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

  // Fetch your site data with error handling
  try {
    // Resolve the master ref to ensure we're using a valid ref
    const api = await client.getApi();
    const masterRef = api.refs.find((ref) => ref.isMasterRef)?.ref || api.refs[0]?.ref;
    
    if (masterRef) {
      // Fetch articles with proper ref resolution
      try {
        const articles = await client.getByType("articles", { 
          ref: masterRef,
          pageSize: 100,
          fetchOptions: {
            next: { 
              tags: ["prismic", "articles"],
              revalidate: 86400 // Cache for 24 hours
            },
          },
        });
        
        articles.results.forEach((article) => {
          pages.push({
            loc: `${baseUrl}/articles/${article.uid}`,
            lastmod: new Date(article.last_publication_date || article.first_publication_date || new Date()).toISOString().split('T')[0],
            changefreq: "weekly",
            priority: 0.8,
          });
        });
      } catch (error) {
        console.error("Error fetching articles for sitemap:", error.message);
        // Continue without articles if fetch fails
      }

      // Fetch galleries with proper ref resolution
      try {
        const galleries = await client.getByType("gallery", { 
          ref: masterRef,
          pageSize: 100,
          fetchOptions: {
            next: { 
              tags: ["prismic", "galleries"],
              revalidate: 86400 // Cache for 24 hours
            },
          },
        });
        
        galleries.results.forEach((gallery) => {
          pages.push({
            loc: `${baseUrl}/galleries/${gallery.uid}`,
            lastmod: new Date(gallery.last_publication_date || gallery.first_publication_date || new Date()).toISOString().split('T')[0],
            changefreq: "weekly",
            priority: 0.7,
          });
        });
      } catch (error) {
        console.error("Error fetching galleries for sitemap:", error.message);
        // Continue without galleries if fetch fails
      }
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