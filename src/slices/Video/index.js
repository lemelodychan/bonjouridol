/**
 * @typedef {import("@prismicio/client").Content.VideoSlice} VideoSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<VideoSlice>} VideoProps
 * @param {VideoProps}
 */
import YoutubeEmbed from "@/app/components/YoutubeEmbed";
import styles from "./page.module.scss";

const Video = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.Video}
    >
      <YoutubeEmbed videoId={slice.primary.youtube_id} />
    </section>
  );
};

export default Video;
