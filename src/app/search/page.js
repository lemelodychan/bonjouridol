import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";

import DocListContainer from "../components/DocList";
import GalleryList from "../components/GalleryList";

import styles from "./page.module.scss";

export default async function SearchPage({ searchParams }) {
    const searchTerm = searchParams.keyword || "";
    const currentPage = parseInt(searchParams.page) || 1;
  
    if (!searchTerm.trim()) {
      return (
        <div className={styles.SearchPage}>
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
  
    try {
        const response = await client.getByType("articles", {
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
                prismic.filter.fulltext("document", searchTerm),
            ],
        });
        results = response.results; // Assign results here
        totalPages = Math.ceil(response.total_results_size / defaultPageSize);


        const responseGallery = await client.getByType("gallery", {
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
        resultsGallery = responseGallery.results;

        return (
            <div className={styles.SearchPage}>
              <h1>Search Results for "{searchTerm}"</h1>
              {resultsGallery.length > 0 && (
                <GalleryList results={resultsGallery} />
              )}
      
              {results.length > 0 ? (
                <DocListContainer
                  results={results}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  postType="Search results"
                />
              ) : (
                <p>No results found.</p>
              )}
            </div>
          );
        } catch (error) {
          console.error("Error fetching search results:", error);
          return (
            <div className={styles.SearchPage}>
              <h1>Search Results</h1>
              <p>An error occurred while fetching search results.</p>
            </div>
        );
    }
}