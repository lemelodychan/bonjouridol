import { createClient } from "@/prismicio";

export async function GET() {
  const client = createClient();

  // Fetch your site data
  const articles = await client.getByType("articles", { pageSize: 100 });
  const galleries = await client.getByType("gallery", { pageSize: 100 });

  // Base URL of your site
  const baseUrl = "https://www.bonjouridol.com";

  // Generate sitemap entries
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

  articles.results.forEach((article) => {
    pages.push({
      loc: `${baseUrl}/articles/${article.uid}`,
      lastmod: new Date(article.last_publication_date || article.first_publication_date || new Date()).toISOString().split('T')[0],
      changefreq: "weekly",
      priority: 0.8,
    });
  });
  
  galleries.results.forEach((gallery) => {
    pages.push({
      loc: `${baseUrl}/galleries/${gallery.uid}`,
      lastmod: new Date(gallery.last_publication_date || gallery.first_publication_date || new Date()).toISOString().split('T')[0],
      changefreq: "weekly",
      priority: 0.7,
    });
  });  

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