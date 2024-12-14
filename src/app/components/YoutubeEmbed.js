"use client";

import React from 'react';
import styles from "./YoutubeEmbed.module.scss";

const YoutubeEmbed = ({ videoId }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <div className={styles.Video_Container}>
      <div className={styles.Video}>
          <iframe
            width="560"
            height="315"
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
      </div>
    </div>
  );
};

export default YoutubeEmbed;