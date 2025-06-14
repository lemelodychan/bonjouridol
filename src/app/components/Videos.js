import styles from './Videos.module.scss';
import Link from 'next/link';
import { IoArrowForwardOutline } from 'react-icons/io5';
import Button from './IconButton.js';

const Videos = () => {
  // You can replace these video IDs with your actual YouTube video IDs
  const videos = [
    { id: 'iAvmqKUW1c8', title: 'Un Jour Avec... Episode 2: Iketeru Hearts' },
    { id: 'Xh5h9_Rt_D0', title: 'Un Jour Avec... Episode 1: Junjou no Afilia' },
    { id: 'DpS7gR-OQc0', title: 'Un Jour Avec... Episode 0: Junjou no Afilia' },
  ];

  return (
    <section className={styles.videos}>
       <h2>
          <span>Bonjour Idol Originals</span>
          <Link href="https://www.youtube.com/@bonjouridol" className={styles.btn}>
              <Button variant={"WhiteGrey"} textValue={"Go to the channel"} icon={<IoArrowForwardOutline />} />
          </Link>
      </h2>
      <div className={styles.grid}>
        {videos.map((video) => (
          <div key={video.id} className={styles.videoWrapper}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.id}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ))}
      </div>
      <Link href="https://www.youtube.com/@bonjouridol" className={styles.btn}>
        <Button variant={"Pink"} textValue={"See more videos"} icon={<IoArrowForwardOutline />} />
      </Link>
    </section>
  );
};

export default Videos; 