import { format } from "date-fns";
import Link from "next/link";
import { IoArrowForwardOutline } from "react-icons/io5";
import Button from "./IconButton";
import SingleImage from "./SingleImage";
import Breadcrumbs from "./Breadcrumbs";
import DocListPagination from "./DocListPagination";

import styles from "./DocList.module.scss";

export default function DocListContainer({ results, currentPage, totalPages, postType }) {
  return (
    <div className={styles.DocListContainer}>
      <Breadcrumbs className={styles.Breadcrumbs} category={postType} />
      <div className={`${styles.DocList} ${postType === "Gallery" ? styles.Galleries : ""}`}>
        {results.length > 0 ? (
          results.map((item) => {
            const linkPath = postType === "Gallery"
              ? `/galleries/${item.uid}`
              : `/articles/${item.uid}`;

            const publicationDate = item.data.publication_date || item.data.event_date || item.first_publication_date;
            const formattedDate = publicationDate
              ? format(new Date(publicationDate), "MMMM d, yyyy")
              : "Unknown date";

            const richTextSlice = item.data.slices.find(
              (slice) => slice.slice_type === "rich_text" && slice.primary?.text
            );
            const paragraphs = richTextSlice?.primary?.text?.map((block) => block.text) || [];
            const joinedText = paragraphs.join(" ");
            
            const photographerName = item.data.photographer?.uid || "Bonjour Idol";

            return (
              <Link key={item.id} className={styles.Post} href={linkPath}>
                {item.data.featured_image && (
                  <div className={styles.FeaturedImage}>
                    <SingleImage 
                      image={item.data.featured_image}
                      alt={item.data.featured_image.alt || ""}
                      color="GreyBg"  
                    />
                  </div>
                )}
                {postType === "Gallery" && (
                     <span className={styles.Artist}>{item.data.artist_name}</span>
                )}
                <div className={styles.Content}>
                  {item.tags && (
                    <div className={styles.Tags}>
                      {item.tags.map((tag) => {
                        const sanitizedTag = tag
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/\s+/g, "")
                          .toLowerCase();
                        return (
                          <span key={tag} className={`${styles.Tag} ${styles[sanitizedTag]}`}>
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <h3>
                    <span>{item.data.title}</span>
                    <span className={styles.icon}><IoArrowForwardOutline /></span>
                  </h3>
                  {item.data.subtitle && (
                    <span className={styles.Subtitle}>{item.data.subtitle}</span>
                  )}
                  <span className={styles.Date}>
                    <span>{formattedDate}</span>
                    {postType === "Gallery" && (
                        <span className={styles.Photographer}>&nbsp;ー Shot by <strong>{photographerName}</strong></span>
                    )}
                  </span>

                  {joinedText && (
                    <p className={styles.Excerpt}>{joinedText}</p>
                  )}

                  <Button variant={"White"} textValue={`${postType === "Gallery" ? "View" : "Read more"}`} icon={<IoArrowForwardOutline />} />
                </div>
              </Link>
            );
          })
        ) : (
          <p>No results found.</p>
        )}
      </div>
      <DocListPagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}