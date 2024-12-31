/**
 * @typedef {import("@prismicio/client").Content.SingleButtonSlice} SingleButtonSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<SingleButtonSlice>} SingleButtonProps
 * @param {SingleButtonProps}
 */

import { PrismicNextLink } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import styles from "./page.module.scss";

const Buttons = ({ slice }) => {

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.ButtonsContainer}
    >
      {slice.primary.title && 
        <h3>{slice.primary.title}</h3>
      }

      {slice.primary.text.length > 0 && 
        <div className={styles.Text}>
          <PrismicRichText field={slice.primary.text} />
        </div>
      }

      <div className={styles.Buttons}>
        {slice.primary.button.map((item, index) => (
          <PrismicNextLink key={index} field={item.link} />
        ))}
      </div>
    </section>
  );
};

export default Buttons;
