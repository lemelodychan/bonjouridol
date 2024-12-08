/**
 * @typedef {import("@prismicio/client").Content.DocListSlice} DocListSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<DocListSlice>} DocListProps
 * @param {DocListProps}
 */
import DocListContent from "@/app/components/DocList";

const DocList = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <DocListContent type={slice.primary.type} />
    </section>
  );
};

export default DocList;
