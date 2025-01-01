/**
 * @typedef {import("@prismicio/client").Content.InterviewSlice} InterviewSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<InterviewSlice>} InterviewProps
 * @param {InterviewProps}
 */
const Interview = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      Placeholder component for interview (variation: {slice.variation}) Slices
    </section>
  );
};

export default Interview;
