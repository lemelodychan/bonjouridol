/**
 * @typedef {import("@prismicio/client").Content.QuoteSlice} QuoteSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<QuoteSlice>} QuoteProps
 * @param {QuoteProps}
 */
import { PrismicRichText } from "@prismicio/react";

const Quote = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <div>
        <PrismicRichText field={slice.primary.quote} />
        <PrismicRichText field={slice.primary.author} />
      </div>
    </section>
  );
};

export default Quote;
