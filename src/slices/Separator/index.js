/**
 * @typedef {import("@prismicio/client").Content.SeparatorSlice} SeparatorSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<SeparatorSlice>} SeparatorProps
 * @param {SeparatorProps}
 */
import styles from "./page.module.scss";

const Separator = ({ slice }) => {
  let separatorClass = styles.separator;

  if (slice.primary.style === "Grey") {
    separatorClass += ` ${styles.grey}`;
  } else if (slice.primary.style === "Gradient") {
    separatorClass += ` ${styles.gradient}`;
  }

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.separatorContainer}
    >
      <div className={separatorClass}></div>
    </section>
  );
};

export default Separator;
