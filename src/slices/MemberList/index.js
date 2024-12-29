/**
 * @typedef {import("@prismicio/client").Content.ImageListSlice} ImageListSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<ImageListSlice>} ImageListProps
 * @param {ImageListProps}
 */
import MemberListContent from "@/app/components/MemberListContent";
import styles from "./page.module.scss"

const MemberList = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.MemberList}
    >
      <h1><span>Meet the team</span></h1>
      <MemberListContent />
    </section>
  );
};

export default MemberList;