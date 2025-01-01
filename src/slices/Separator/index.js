/**
 * @typedef {import("@prismicio/client").Content.SeparatorSlice} SeparatorSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<SeparatorSlice>} SeparatorProps
 * @param {SeparatorProps}
 */
import styles from "./page.module.scss";

const Separator = ({ slice }) => {
  const { style } = slice.primary.style;

  const separatorClass = classNames(styles.separator, {
    [styles.grey]: style === "Grey",
    [styles.gradient]: style === "Gradient",
  });

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
