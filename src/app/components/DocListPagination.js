"use client";
import { useRouter } from "next/navigation";  // Import from next/navigation
import Button from "./IconButton";
import Link from "next/link";
import styles from "./DocListPagination.module.scss";

import { IoArrowForwardOutline } from "react-icons/io5";
import { IoArrowBackOutline } from "react-icons/io5";

export default function DocListPagination({ currentPage, totalPages }) {
  const router = useRouter();

  const handlePageChange = (newPage) => {
    // Safely construct the new URL with updated query parameters
    const url = new URL(window.location.href);
    url.searchParams.set("page", newPage); // Update the query param for page

    // Push the updated URL
    router.push(url.toString());
  };

  return (
    <div className={styles.pagination}>
      <span>
        {currentPage > 1 && (
          <div
            onClick={() => handlePageChange(currentPage - 1)}
            className={styles.pageButton}
          >
            <Button variant={"White"} textValue={"Previous"} icon={<IoArrowBackOutline />} />
          </div>
        )}
      </span>
      <span className={styles.pageInfo}>
        Page {currentPage} of {totalPages}
      </span>
      <span>
        {currentPage < totalPages && (
          <div
            onClick={() => handlePageChange(currentPage + 1)}
            className={styles.pageButton}
          >
            <Button variant={"White"} textValue={"Next"} icon={<IoArrowForwardOutline />} />
          </div>
        )}
      </span>
    </div>
  );
}
