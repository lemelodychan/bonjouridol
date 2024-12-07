/**
 * @typedef {import("@prismicio/client").Content.SingleButtonSlice} SingleButtonSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<SingleButtonSlice>} SingleButtonProps
 * @param {SingleButtonProps}
 */
const SingleButton = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      Placeholder component for single_button (variation: {slice.variation})
      Slices
    </section>
  );
};

export default SingleButton;
