/**
 * @typedef {import("@prismicio/client").Content.LinksSlice} LinksSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<LinksSlice>} LinksProps
 * @param {LinksProps}
 */
const Links = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      Placeholder component for links (variation: {slice.variation}) Slices
    </section>
  );
};

export default Links;
