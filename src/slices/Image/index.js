/**
 * @typedef {import("@prismicio/client").Content.ImageSlice} ImageSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<ImageSlice>} ImageProps
 * @param {ImageProps}
 */
import { PrismicNextImage } from "@prismicio/next";

const Image = ({ slice }) => {
  const isFullwidth = !!slice.primary.is_fullwidth;
  const width = slice.primary.image_width;

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <PrismicNextImage
        field={slice.primary.image}
        alt={slice.primary.image.alt || ""}
        className={isFullwidth ? "FullWidth" : ""}
        style={!isFullwidth ? { width: `${width}px` } : undefined}
      />
    </section>
  );
};

export default Image;