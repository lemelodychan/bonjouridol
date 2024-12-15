/**
 * @typedef {import("@prismicio/client").Content.AuthorsSlice} AuthorsSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<AuthorsSlice>} AuthorsProps
 * @param {AuthorsProps}
 */
import Author from "@/app/components/Author";
import styles from "./page.module.scss";

const Authors = ({ slice }) => {
  const author = slice.primary.author;
  const photo = slice.primary.photographer;

  return (
    <div 
      className={styles.credits}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
        <Author author={author} type="Written" />
        
        {author && photo && author.uid !== photo.uid && 
          <Author author={photo} type="Photographed" />
        }
    </div>
  );
};

export default Authors;
