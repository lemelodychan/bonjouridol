/**
 * @typedef {import("@prismicio/client").Content.SetlistSlice} SetlistSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<SetlistSlice>} SetlistProps
 * @param {SetlistProps}
 */
const Setlist = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      Placeholder component for setlist (variation: {slice.variation}) Slices
    </section>
  );
};

export default Setlist;
