import { createClient } from '@/prismicio';
import styles from './page.module.scss';
import { components } from '@/slices';
import { format } from 'date-fns';
import Breadcrumbs from '@/app/components/Breadcrumbs';
import { PrismicNextImage } from '@prismicio/next';
import { PrismicRichText, PrismicText, SliceZone } from '@prismicio/react';
import SingleImage from '@/app/components/SingleImage';
import SharingOptions from '../../components/SharingOptions';
import Gallery from '@/app/components/Gallery';
import FeaturedImage from '@/app/assets/FeaturedImage.png';
import Image from 'next/image';
import { HiOutlineLocationMarker, HiOutlineCalendar } from 'react-icons/hi';
import Custom404 from '@/app/404';

export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const { uid } = await params;
  const client = createClient();

  try {
    const article = await client.getByUID('articles', uid);

    const publicationDate = article.data.publication_date || article.first_publication_date;
    const formattedDate = publicationDate
      ? format(new Date(publicationDate), "MMMM d, yyyy")
      : "Unknown date";
    const richTextSlice = article.data.slices.find(
      (slice) => slice.slice_type === "rich_text" && slice.primary?.text
    );
    const paragraphs = richTextSlice?.primary?.text;
    const excerpt = paragraphs && paragraphs.length > 0 ? paragraphs[0].text : null;
    const articleExcerpt = `Posted on ${formattedDate} - ${excerpt}`;

    const title = article.data.meta_title || `${article.data.title}${article.data.subtitle ? `: ${article.data.subtitle}` : ''} | BONJOUR IDOL`;
    const description = article.data.meta_description || articleExcerpt || 'Bonjour Idol is a French media about the Japanese idol scene. Check out exclusive content, interviews, and photo reports.';
    const imageUrl = article.data.meta_image?.url || '/FeaturedImage.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://www.bonjouridol.com/articles/${uid}`,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error('Error fetching metadata for article:', error);
    return {
      title: 'Article Not Found | BONJOUR IDOL',
      description: 'The article you\'re looking for doesn\'t exist.',
      openGraph: {
        title: 'Article Not Found | BONJOUR IDOL',
        description: 'The article you\'re looking for doesn\'t exist.',
        images: [
          {
            url: '/FeaturedImage.png',
            width: 1200,
            height: 630,
            alt: 'Bonjour Idol',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Article Not Found | BONJOUR IDOL',
        description: 'The article you\'re looking for doesn\'t exist.',
        images: ['/FeaturedImage.png'],
      },
    };
  }
}


export default async function Page({ params }) {
  const { uid } = await params;
  const client = createClient();

  let article = null;

  try {
    article = await client.getByUID('articles', uid, {
      ref: client.masterRef,
      fetchLinks: [
        'author.uid',
        'author.name',
        'author.profile_picture',
        'author.description',
        'author.twitter',
        'author.instagram',
        'author.website',
        'photographer.uid',
        'photographer.name',
        'photographer.profile_picture',
        'photographer.description',
        'photographer.twitter',
        'photographer.instagram',
        'photographer.website',
        'gallery.gallery',
      ],
      fetchOptions: {
        cache: 'no-store',
      },
    });

    if (!article) {
      return <Custom404 />;
    }
  } catch (error) {
    console.error('Error fetching article:', error);
    return <Custom404 />;
  }

  const author = article.data.author;
  const photo = article.data.photographer;
  const galleryLink = article.data.gallery_link;
  const galleryCount = galleryLink?.data?.gallery?.length || 0;

  const imageUrl = article.data.featured_image.url;

  const publicationDate = article.data.publication_date || article.first_publication_date;
  const formattedDate = publicationDate ? format(new Date(publicationDate), 'MMMM d, yyyy') : 'Unknown date';

  const eventDate = article.data.event_date || article.first_publication_date;
  const formattedEventDate = eventDate ? format(new Date(eventDate), 'MMMM d, yyyy') : 'Unknown date';

  return (
    <>
      <article className={styles.container}>
        <div className={styles.header}>
          <span className={styles.FeaturedImage}>
            <SingleImage image={article.data.featured_image} alt={article.data.featured_image.alt} />
          </span>
          <Breadcrumbs
            type="white"
            className={styles.Breadcrumbs}
            category={article.data.type}
            title={article.data.title}
            subtitle={article.data.subtitle}
            uid={article.uid}
          />

          <div className={styles.HeaderContent}>
            <div className={styles.tag}>
              {article.data.event_date && (
                <span className={styles.date}>
                  <HiOutlineCalendar />
                  {formattedEventDate}
                </span>
              )}
              {article.data.venue && (
                <span className={styles.venue}>
                  <HiOutlineLocationMarker />
                  {article.data.venue}
                </span>
              )}
            </div>

            <div className={styles.TitleContainer}>
              <h1 className={styles.title}>
                <span>{article.data.title}</span>
              </h1>
              {article.data.subtitle && (
                <h2 className={styles.subtitle}>
                  <span>{article.data.subtitle}</span>
                </h2>
              )}
            </div>
          </div>
        </div>

        <div className={styles.information}>
          {article.data.author && (
            <div className={styles.author}>
              <span className={styles.authorImg}>
                {article.data.author?.data?.profile_picture ? (
                    <PrismicNextImage field={article.data.author?.data?.profile_picture} fallbackAlt="" />
                    ) : (
                    <Image
                        src={'/LogoBI.png'}
                        alt="Bonjour Idol Logo"
                        width={100}
                        height={100}
                    />
                )}
              </span>
              <span className={styles.authorInfo}>
                <span className={styles.authorName}>{article.data.author?.data?.name || 'Bonjour Idol'}</span>
                <span className={styles.date}>{formattedDate}</span>
              </span>
            </div>
          )}
          <SharingOptions className={styles.Sharing} uid={article.uid} title={article.data.meta_title} idol={article.data.idol_name} />
        </div>

        <div className={styles.content}>
          <SliceZone slices={article.data.slices} components={components} />
        </div>

        {galleryLink?.data?.gallery?.length > 0 && (
          <div className={styles.Gallery}>
            <h2>
              <span>Full Gallery</span>
              <span className={styles.Counter}>{galleryCount} photos</span>
            </h2>
            <Gallery
              images={galleryLink.data.gallery.map(item => ({
                image: item.image,
              }))}
              color="white"
            />
          </div>
        )}
      </article>
    </>
  );
}