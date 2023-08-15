/**
 * @typedef {import("@prismicio/client").Content.RichTextSlice} RichTextSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<RichTextSlice>} RichTextProps
 * @param {RichTextProps}
 */
import { PrismicRichText } from "@prismicio/react";
import styles from "./RichText.module.scss"

const RichText = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <PrismicRichText field={slice.primary.title} />
      <PrismicRichText field={slice.primary.content} />

      <div className={styles.repeatable}>
        {slice.items.map((item) => (
            <PrismicRichText field={item.text} />
        ))}
      </div>
    </section>
  );
};

export default RichText;
