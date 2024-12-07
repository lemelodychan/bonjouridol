/**
 * @typedef {import("@prismicio/client").Content.QuoteSlice} QuoteSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<QuoteSlice>} QuoteProps
 * @param {QuoteProps}
 */
const Quote = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      Placeholder component for quote (variation: {slice.variation}) Slices
    </section>
  );
};

export default Quote;
