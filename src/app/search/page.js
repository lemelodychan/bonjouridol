import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";

import DocListContainer from "../components/DocList";

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
            // prismic.filter.fulltext("my.articles.idol_name", searchTerm),
            prismic.filter.fulltext("document", searchTerm),
        ],
        });
        const results = response.results;
        const totalPages = Math.ceil(response.total_results_size / defaultPageSize);

        return (
        <div className={styles.SearchPage}>
            <h1>Search Results for "{searchTerm}"</h1>
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