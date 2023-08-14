/**
 * @typedef {import("@prismicio/client").Content.RichTextSlice} RichTextSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<RichTextSlice>} RichTextProps
 * @param {RichTextProps}
 */
const RichText = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      Placeholder component for rich_text (variation: {slice.variation}) Slices
    </section>
  );
};

export default RichText;
