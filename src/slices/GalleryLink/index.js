/**
 * @typedef {import("@prismicio/client").Content.GalleryLinkSlice} GalleryLinkSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<GalleryLinkSlice>} GalleryLinkProps
 * @param {GalleryLinkProps}
 */
import React from "react";

const GalleryLink = ({ slice }) => {
  const linkedGallery = slice.primary.gallery;

  if (!linkedGallery) {
    return <p>No linked gallery available</p>;
  }

  return (
    <section>
      Blah
    </section>
  );
};

export default GalleryLink;