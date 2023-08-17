/**
 * @typedef {import("@prismicio/client").Content.SingleImageSlice} SingleImageSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<SingleImageSlice>} SingleImageProps
 * @param {SingleImageProps}
 */
import { PrismicText } from "@prismicio/react";
import { PrismicNextImage } from "@prismicio/next";

const SingleImage = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <PrismicNextImage field={slice.primary.image} />
      <div>
        <PrismicText field={slice.primary.caption} />
      </div>
    </section>
  );
};

export default SingleImage;
