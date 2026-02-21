import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";
import { getKnownArtistNames, resolveArtistNames } from "@/utils/artistUtils";

import DocListContainer from "../components/DocList";
import GalleryList from "../components/GalleryList";
import ArtistProfile from "../components/ArtistProfile";
import SearchTracker from "./SearchTracker";

import styles from "./page.module.scss";

// Function to fetch like counts for multiple articles
async function fetchArticleLikeCounts(slugs) {
  try {
    const { createSupabaseClient } = await import('@/lib/supabase');
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
    const isAuthorSearch = params?.author === "true";

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
    const knownArtists = await getKnownArtistNames();
    let results = [];
    let resultsGallery = [];
    let totalPages = 0;
    const defaultPageSize = 10;

    let idolNameResults = [];
    let titleResults = [];
    let subtitleResults = [];
    let documentResults = [];
    let combinedResults = [];
    let exactArtistMatch = null;
    let exactAuthorMatch = null;
  
    try {
        // Only perform author search if explicitly requested via author parameter
        if (isAuthorSearch) {
          // Check if search term is an exact match for an author/photographer
          const exactAuthorResponse = await client.getByType("author", {
            fetchOptions: {
              next: { 
                tags: ["prismic", "authors"],
                revalidate: 1800 // Cache for 30 minutes
              },
            },
            filters: [prismic.filter.at("my.author.name", searchTerm)],
          });

          if (exactAuthorResponse.results.length > 0) {
          exactAuthorMatch = exactAuthorResponse.results[0];
          
          // If it's an exact author match, fetch their articles and galleries
          const authorUid = exactAuthorMatch.uid;

          // Fetch all articles and filter for photographer work in JavaScript
          const allArticlesResponse = await client.getAllByType("articles", {
            fetchOptions: {
              next: { 
                tags: ["prismic", "articles"],
                revalidate: 1800 // Cache for 30 minutes
              },
            },
            orderings: [
              { field: "my.articles.publication_date", direction: "desc" },
              { field: "document.first_publication_date", direction: "desc" },
            ],
          });

          // Filter articles where this person is the author or translator
          const authorAndTranslatorArticles = allArticlesResponse.filter(article => {
            // Check if they're the author
            if (article.data.author?.uid === authorUid) {
              return true;
            }
            
            // Check if they're credited as a translator in the Authors slice
            const authorsSlice = article.data.slices?.find(slice => slice.slice_type === 'authors');
            if (!authorsSlice) return false;
            
            return authorsSlice.primary?.translator_pr?.uid === authorUid ||
                   authorsSlice.primary?.translator_jp?.uid === authorUid ||
                   authorsSlice.primary?.translator_en?.uid === authorUid ||
                   authorsSlice.primary?.translator_fr?.uid === authorUid;
          });

          results = authorAndTranslatorArticles;
          totalPages = Math.ceil(results.length / defaultPageSize);

          // Fetch all galleries and filter for photographer work in JavaScript
          const allGalleriesResponse = await client.getAllByType("gallery", {
            fetchOptions: {
              next: { 
                tags: ["prismic", "galleries"],
                revalidate: 1800 // Cache for 30 minutes
              },
            },
            orderings: [
              { field: "my.gallery.event_date", direction: "desc" },
              { field: "document.first_publication_date", direction: "desc" },
            ],
            fetchLinks: ["my.gallery.photographer.name", "my.gallery.photographer_2.name"],
          });

          // Filter galleries where this person is the photographer
          const photographerGalleries = allGalleriesResponse.filter(gallery => {
            // Skip official photos
            if (gallery.data.is_official_photos) return false;
            
            // Check if the person is the primary or secondary photographer
            return gallery.data.photographer?.uid === authorUid || 
                   gallery.data.photographer_2?.uid === authorUid;
          });

          // Limit galleries to 10 latest for author searches
          const limitedGalleries = photographerGalleries.slice(0, 10);
          resultsGallery = limitedGalleries;

          // Resolve artist names for all results
          results = results.map(item => ({
            ...item,
            resolvedArtists: resolveArtistNames(item.data.idol_name, knownArtists),
          }));
          resultsGallery = resultsGallery.map(item => ({
            ...item,
            resolvedArtists: resolveArtistNames(item.data.artist_name, knownArtists),
          }));

          // Fetch like counts for all articles
          const articleSlugs = results.map(item => item.uid).filter(Boolean);
          const likeCounts = await fetchArticleLikeCounts(articleSlugs);

          return (
            <div className={styles.SearchPage}>
              <SearchTracker searchTerm={searchTerm} />
              <h1>
                <span className={styles.title}>
                  <span className={styles.en}>Work by {exactAuthorMatch.data.name}</span>
                  <span className={styles.ja}>{exactAuthorMatch.data.name}の作品</span>
                </span>
              </h1>

              {resultsGallery.length > 0 && (
                <div className={styles.GalleryList}>
                  <h2>As photographer</h2>
                  <GalleryList results={resultsGallery} />
                </div>
              )}
          
              <div className={`${styles.SearchResults} ${styles.AuthorSearch}`}>
                {results.length > 0 ? (
                  <>
                    <h2>As writer</h2>
                    <div className={styles.DocList}>
                      <DocListContainer
                        results={results}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        postType="Search results"
                        likeCounts={likeCounts}
                      />
                    </div>
                  </>
                ) : (
                  <p>No articles found.</p>
                )}
              </div>
            </div>
          );
          }
        }

        // Regular search logic (when not an author search or when author not found)
        // Fetch exact artist match
        const exactArtistResponse = await client.getByType("artist", {
          fetchOptions: {
            next: { 
              tags: ["prismic", "artists"],
              revalidate: 1800 // Cache for 30 minutes
            },
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
            filters: [
                prismic.filter.fulltext("my.articles.idol_name", searchTerm),
            ],
        });
        idolNameResults = response1.results;

        const titleResponse = await client.getByType("articles", {
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
            filters: [prismic.filter.fulltext("my.articles.title", searchTerm)],
        });
        titleResults = titleResponse.results;
        
        const subtitleResponse = await client.getByType("articles", {
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
        filters: [prismic.filter.fulltext("my.articles.subtitle", searchTerm)],
        });
        subtitleResults = subtitleResponse.results;

        const documentResponse = await client.getByType("articles", {
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

        // Note: Artist like counts will be fetched client-side by the batched hook
        // This eliminates server-side fetch issues and provides better performance
        const artistLikeCounts = {};


        const exactMatchGallery = await client.getByType("gallery", {
            fetchOptions: {
              next: { 
                tags: ["prismic", "galleries"],
                revalidate: 1800 // Cache for 30 minutes
              },
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
              next: { 
                tags: ["prismic", "galleries"],
                revalidate: 1800 // Cache for 30 minutes
              },
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

        // Resolve artist names for all results
        results = results.map(item => ({
          ...item,
          resolvedArtists: resolveArtistNames(item.data.idol_name, knownArtists),
        }));
        resultsGallery = resultsGallery.map(item => ({
          ...item,
          resolvedArtists: resolveArtistNames(item.data.artist_name, knownArtists),
        }));

        return (
            <div className={styles.SearchPage}>
              <SearchTracker searchTerm={searchTerm} />
              <h1>
                <span className={styles.title}>
                  <span className={styles.en}>Search Results for "{searchTerm}"</span>
                  <span className={styles.ja}>"{searchTerm}"の検索結果</span>
                </span>
              </h1>

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
                  <ArtistProfile 
                    artist={exactArtistMatch} 
                    likeCounts={artistLikeCounts}
                  />
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