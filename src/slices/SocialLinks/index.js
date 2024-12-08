/**
 * @typedef {import("@prismicio/client").Content.SocialLinksSlice} SocialLinksSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<SocialLinksSlice>} SocialLinksProps
 * @param {SocialLinksProps}
 */
import { PrismicNextLink } from "@prismicio/next";
import styles from "./page.module.scss";

const SocialLinks = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.SocialLinksContainer}
    >
      <div>
        <span>Follow them on social media :</span>
        <div className={styles.SocialLinks}>
          {slice.primary.links.map((item, index) => (
            <PrismicNextLink key={index} field={item.link} />
          ))}
        </div>
      </div>

    </section>
  );
};

export default SocialLinks;
