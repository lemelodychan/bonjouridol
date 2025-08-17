import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";

import DocListContainer from "../components/DocList";
import GalleryList from "../components/GalleryList";
import ArtistProfile from "../components/ArtistProfile";
import SearchTracker from "./SearchTracker";

// Import Supabase client for server-side like fetching
const { createSupabaseClient } = await import('@/lib/supabase');

import styles from "./page.module.scss";

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

export default async function SearchPage({ searchParams }) {
    const params = await searchParams;
    const searchTerm = params?.keyword || "";
    const currentPage = parseInt(params?.page) || 1;

    if (!searchTerm.trim()) {
      return (
        <div className={styles.SearchPage}>
          <SearchTracker searchTerm={searchTerm} />
          <h1>Search Results</h1>
          <p>Please provide a valid term in the search query.</p>
        </div>
      );
    }
  
    const client = createClient();
    let results = [];
    let resultsGallery = [];
    let totalPages = 0;
    const defaultPageSize = 10;

    let idolNameResults = [];
    let titleResults = [];
    let subtitleResults = [];
    let documentResults = [];
    let combinedResults = [];
    let exactArtistMatch = null
  
    try {
        // Fetch exact artist match
        const exactArtistResponse = await client.getByType("artist", {
          fetchOptions: {
            cache: "no-store",
          },
          filters: [prismic.filter.fulltext("my.artist.name_en", searchTerm)],
        })

        if (exactArtistResponse.results.length > 0) {
          exactArtistMatch = exactArtistResponse.results[0]
        }

        console.log(exactArtistMatch);

        // Search logic
        const response1 = await client.getByType("articles", {
            fetchOptions: {
            cache: "no-store",
            },
            pageSize: defaultPageSize,
            page: currentPage,
            orderings: [
                { field: "my.articles.publication_date", direction: "desc" },
                { field: "document.first_publication_date", direction: "desc" },
            ],
            filters: [
                prismic.filter.fulltext("my.articles.idol_name", searchTerm),
            ],
        });
        idolNameResults = response1.results;

        const titleResponse = await client.getByType("articles", {
            fetchOptions: {
              cache: "no-store",
            },
            pageSize: defaultPageSize,
            page: currentPage,
            orderings: [
              { field: "my.articles.publication_date", direction: "desc" },
              { field: "document.first_publication_date", direction: "desc" },
            ],
            filters: [prismic.filter.fulltext("my.articles.title", searchTerm)],
        });
        titleResults = titleResponse.results;
        
        const subtitleResponse = await client.getByType("articles", {
        fetchOptions: {
            cache: "no-store",
        },
        pageSize: defaultPageSize,
        page: currentPage,
        orderings: [
            { field: "my.articles.publication_date", direction: "desc" },
            { field: "document.first_publication_date", direction: "desc" },
        ],
        filters: [prismic.filter.fulltext("my.articles.subtitle", searchTerm)],
        });
        subtitleResults = subtitleResponse.results;

        const documentResponse = await client.getByType("articles", {
            fetchOptions: {
              cache: "no-store",
            },
            pageSize: defaultPageSize,
            page: currentPage,
            orderings: [
              { field: "my.articles.publication_date", direction: "desc" },
              { field: "document.first_publication_date", direction: "desc" },
            ],
            filters: [prismic.filter.fulltext("document", searchTerm)],
        });
        documentResults = documentResponse.results;

        const idolNameIds = new Set(idolNameResults.map((item) => item.id));
        const titleIds = new Set(titleResults.map((item) => item.id));
        const subtitleIds = new Set(subtitleResults.map((item) => item.id));

        const combinedResults = [
            ...idolNameResults,
            ...titleResults.filter((item) => !idolNameIds.has(item.id)),
            ...subtitleResults.filter(
            (item) => !idolNameIds.has(item.id) && !titleIds.has(item.id)
            ),
            ...documentResults.filter(
            (item) =>
                !idolNameIds.has(item.id) &&
                !titleIds.has(item.id) &&
                !subtitleIds.has(item.id)
            ),
        ];
        totalPages = Math.ceil(combinedResults.length / defaultPageSize);
        results = combinedResults;

        // Fetch like counts for all articles
        const articleSlugs = results.map(item => item.uid).filter(Boolean);
        const likeCounts = await fetchArticleLikeCounts(articleSlugs);


        const exactMatchGallery = await client.getByType("gallery", {
            fetchOptions: {
            cache: "no-store",
            },
            orderings: [
            { field: "my.gallery.event_date", direction: "desc" },
            { field: "document.first_publication_date", direction: "desc" },
            ],
            fetchLinks: ["my.gallery.photographer.name"],
            filters: [
            prismic.filter.not("my.gallery.is_official_photos", true),
            prismic.filter.at("my.gallery.artist_name", searchTerm),
            ],
        });
        
        const partialMatchGallery = await client.getByType("gallery", {
            fetchOptions: {
            cache: "no-store",
            },
            orderings: [
            { field: "my.gallery.event_date", direction: "desc" },
            { field: "document.first_publication_date", direction: "desc" },
            ],
            fetchLinks: ["my.gallery.photographer.name"],
            filters: [
            prismic.filter.not("my.gallery.is_official_photos", true),
            prismic.filter.fulltext("my.gallery.artist_name", searchTerm),
            ],
        });

        const exactMatchIds = new Set(exactMatchGallery.results.map((item) => item.id));
        const combinedResultsGallery = [
            ...exactMatchGallery.results,
            ...partialMatchGallery.results.filter((item) => !exactMatchIds.has(item.id)),
        ];
        resultsGallery = combinedResultsGallery;

        return (
            <div className={styles.SearchPage}>
              <SearchTracker searchTerm={searchTerm} />
              <h1>Search Results for "{searchTerm}"</h1>

                {resultsGallery.length > 0 && (
                  <div className={styles.GalleryList}>
                    <GalleryList results={resultsGallery} />
                  </div>
                )}
        
              <div className={styles.SearchResults}>
                {results.length > 0 ? (
                  <div className={styles.DocList}>
                    <DocListContainer
                      results={results}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      postType="Search results"
                      likeCounts={likeCounts}
                    />
                  </div>
                ) : (
                  <p>No results found.</p>
                )}

                {exactArtistMatch && 
                  <ArtistProfile artist={exactArtistMatch} />
                }
              </div>
            </div>
          );
        } catch (error) {
          console.error("Error fetching search results:", error);
          return (
            <div className={styles.SearchPage}>
              <SearchTracker searchTerm={searchTerm} />
              <h1>Search Results</h1>
              <p>An error occurred while fetching search results.</p>
            </div>
        );
    }
}