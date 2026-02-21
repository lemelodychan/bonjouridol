import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";
import { SliceZone } from "@prismicio/react";
import { components } from "@/slices";
import DocListContainer from "../components/DocList";
import { getKnownArtistNames, resolveArtistNames } from "@/utils/artistUtils";

// Import Supabase client for server-side like fetching
const { createSupabaseClient } = await import('@/lib/supabase');
import FeaturedImage from "@/app/assets/FeaturedImage.png";
import styles from "./page.module.scss";
import Custom404 from "@/app/not-found";

export async function generateMetadata({ params }) {
  const { uid } = await params;
  const client = createClient();

  try {
    const page = await client.getByUID("page", uid);
    
    const title = page?.data?.meta_title || `${page?.data?.title} | BONJOUR IDOL`;
    const description = page?.data?.meta_description || "Bonjour Idol is a French media about the Japanese idol scene. Our team are idol fans and will be sharing their passion through photo reports of concerts and events, interviews and more exclusive content. Check it out!";
    const imageUrl = page?.data?.meta_image?.url || '/FeaturedImage.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://www.bonjouridol.com/${uid}`,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    return {
      title: "Page Not Found | BONJOUR IDOL",
      description: "The page you're looking for doesn't exist.",
      openGraph: {
        title: "Page Not Found | BONJOUR IDOL",
        description: "The page you're looking for doesn't exist.",
        url: 'https://www.bonjouridol.com',
        images: [
          {
            url: '/FeaturedImage.png',
            width: 1200,
            height: 630,
            alt: 'Bonjour Idol',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: "Page Not Found | BONJOUR IDOL",
        description: "The page you're looking for doesn't exist.",
        images: ['/FeaturedImage.png'],
      },
    };
  }
}

export async function generateStaticParams() {
  const client = createClient();
  const pages = await client.getAllByType("page");
  return pages.map((page) => ({ uid: page.uid }));
}

// Function to fetch like counts for multiple articles
async function fetchArticleLikeCounts(slugs) {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) return {};

    const { data: likesData, error } = await supabase
      .from('article_likes')
      .select('slug, like_count')
      .in('slug', slugs);

    if (error) {
      console.error('Error fetching article like counts:', error);
      return {};
    }

    const likeCounts = {};
    likesData.forEach(like => {
      if (!likeCounts[like.slug]) {
        likeCounts[like.slug] = 0;
      }
      likeCounts[like.slug] += like.like_count;
    });

    return likeCounts;
  } catch (error) {
    console.error('Error in fetchArticleLikeCounts:', error);
    return {};
  }
}

export default async function Page({ params, searchParams }) {
  const { uid } = await params;
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page) || 1;
  const selectedYear = resolvedSearchParams.year ? parseInt(resolvedSearchParams.year) : null;
  const client = createClient();

  try {
    // Fetch the page first
    const page = await client.getByUID("page", uid);

    if (!page) {
      return <Custom404 />;
    }

    const isOtherType = page.data.type === "Other";
    let postType, category;
    const pageType = page.data.type || resolvedSearchParams.type || "Live reports";

    switch (pageType) {
      case "Live reports":
        postType = "Live report";
        category = "articles";
        break;
      case "Discoveries":
        postType = "Discovery";
        category = "articles";
        break;
      case "Press Releases":
        postType = "Press release";
        category = "articles";
        break;
      case "Features":
        postType = "Features";
        category = "articles";
        break;
      case "Galleries":
        postType = "Gallery";
        category = "galleries";
        break;
      default:
        postType = "Unknown";
        category = "unknown";
    }

    let results = [];
    let totalPages = 0;
    let likeCounts = {}; // Initialize likeCounts
    let availableYears = [];
    const defaultPageSize = 10;

    if (category === "articles") {
      try {
        // Build base filters
        const baseFilters = [
          prismic.filter.any(
            "my.articles.type",
            postType === "Live report"
              ? ["Live report"]
              : postType === "Features"
              ? []
              : [postType]
          ),
          ...(postType === "Features"
            ? [prismic.filter.any("document.tags", ["Interview", "Editorial", "Behind the scenes", "Other"])]
            : postType === "Press release"
            ? [prismic.filter.at("document.tags", ["PR"])]
            : []),
        ];

        // Add year filter if selected
        // For articles, filter by publication_date
        if (selectedYear) {
          // Use start of year and start of next year (exclusive) for more reliable filtering
          const yearStart = new Date(selectedYear, 0, 1).toISOString().split('T')[0];
          const nextYearStart = new Date(selectedYear + 1, 0, 1).toISOString().split('T')[0];
          
          baseFilters.push(
            prismic.filter.dateAfter("my.articles.publication_date", yearStart),
            prismic.filter.dateBefore("my.articles.publication_date", nextYearStart)
          );
        }

        const articles = await client.getByType("articles", {
          fetchOptions: {
            next: { 
              tags: ["prismic", "articles"],
              revalidate: 1800 // Cache for 30 minutes
            },
          },
          pageSize: defaultPageSize,
          page: currentPage,
          orderings: [
            { field: "my.articles.publication_date", direction: "desc" },
            { field: "document.first_publication_date", direction: "desc" },
          ],
          filters: baseFilters,
        });
        results = articles.results;
        totalPages = Math.ceil(articles.total_results_size / defaultPageSize);
        
        // Fetch like counts for all articles
        const articleSlugs = results.map(item => item.uid).filter(Boolean);
        likeCounts = await fetchArticleLikeCounts(articleSlugs);

        // Generate available years: 2016 to current year
        const currentYear = new Date().getFullYear();
        availableYears = [];
        for (let year = currentYear; year >= 2016; year--) {
          availableYears.push(year);
        }
      } catch (error) {
        console.error("Error fetching articles:", error);
      }
    }

    if (category === "galleries") {
      try {
        // Build base filters
        const baseFilters = [
          prismic.filter.not("my.gallery.is_official_photos", true)
        ];

        // Add year filter if selected
        // For galleries, filter by event_date
        if (selectedYear) {
          // Use start of year and start of next year (exclusive) for more reliable filtering
          const yearStart = new Date(selectedYear, 0, 1).toISOString().split('T')[0];
          const nextYearStart = new Date(selectedYear + 1, 0, 1).toISOString().split('T')[0];
          
          baseFilters.push(
            prismic.filter.dateAfter("my.gallery.event_date", yearStart),
            prismic.filter.dateBefore("my.gallery.event_date", nextYearStart)
          );
        }

        const galleries = await client.getByType("gallery", {
          ref: client.masterRef,
          fetchOptions: {
            next: { 
              tags: ["prismic", "galleries"],
              revalidate: 1800 // Cache for 30 minutes
            },
          },
          pageSize: defaultPageSize,
          page: currentPage,
          orderings: [
            { field: "my.gallery.event_date", direction: "desc" },
            { field: "document.first_publication_date", direction: "desc" },
          ],
          fetchLinks: ["my.gallery.photographer.name"],
          filters: baseFilters,
        });
        results = galleries.results;
        totalPages = Math.ceil(galleries.total_results_size / defaultPageSize);

        // Generate available years: 2016 to current year
        const currentYear = new Date().getFullYear();
        availableYears = [];
        for (let year = currentYear; year >= 2016; year--) {
          availableYears.push(year);
        }
      } catch (error) {
        console.error("Error fetching galleries:", error);
      }
    }

    // Resolve artist names for all results
    if (results.length > 0) {
      const knownArtists = await getKnownArtistNames();
      const nameField = category === "galleries" ? "artist_name" : "idol_name";
      results = results.map(item => ({
        ...item,
        resolvedArtists: resolveArtistNames(item.data[nameField], knownArtists),
      }));
    }

    return (
      <div className={styles.container}>
        <h1>{page.data.title}</h1>
        <div className={styles.pageContent}>
          <SliceZone slices={page.data.slices} components={components} />

          {!isOtherType && (
            <DocListContainer
              results={results}
              currentPage={currentPage}
              totalPages={totalPages}
              postType={postType}
              likeCounts={likeCounts}
              availableYears={availableYears}
              selectedYear={selectedYear}
            />
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    return <Custom404 />;
  }
}