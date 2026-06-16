import React from "react";
import { PrismicNextLink } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import { createClient } from "@/prismicio";
import * as prismic from "@prismicio/client";
import SingleImage from "./SingleImage";
import YoutubeEmbed from "./YoutubeEmbed";
import ArtistLike from "./ArtistLike";
import SeamlessTicker from "./SeamlessTicker";

import { FaInstagram, FaYoutube, FaTiktok, FaPlay } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";
import { HiOutlineLink } from 'react-icons/hi';
import Link from "next/link";
import Button from "./IconButton";
import { IoArrowForwardOutline } from "react-icons/io5";

import styles from "./ArtistHighlight.module.scss";

// Mock data for now - will be replaced with Prismic data
const mockArtist = {
  id: "mock-1",
  uid: "mock-artist",
  data: {
    profile_picture: {
      url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
      alt: "Artist profile"
    },
    name_en: "Starlight Dreams",
    name_jp: "スターライトドリームズ",
    debut: "2020-03-15",
    disband: null,
    description: [
      {
        type: "paragraph",
        text: "Starlight Dreams is a vibrant idol group that brings energy and joy to every performance. Known for their catchy melodies and dynamic choreography, they have captured the hearts of fans worldwide. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        spans: []
      }
    ],
    website: { url: "https://example.com" },
    twitter: { url: "https://twitter.com/starlightdreams" },
    instagram: { url: "https://instagram.com/starlightdreams" },
    youtube: { url: "https://youtube.com/watch?v=dQw4w9WgXcQ" },
    tiktok: { url: "https://tiktok.com/@starlightdreams" },
    song_list: [
      {
        song_title_en: "Shining Star",
        song_title_ja: "シャイニングスター",
        song_link: { url: "https://youtube.com/watch?v=dQw4w9WgXcQ" },
        song_cover: {
          url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
          alt: "Shining Star"
        }
      },
      {
        song_title_en: "Dream Tonight",
        song_title_ja: "ドリームトゥナイト",
        song_link: { url: "https://youtube.com/watch?v=example2" },
        song_cover: {
          url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
          alt: "Dream Tonight"
        }
      },
      {
        song_title_en: "Eternal Light",
        song_title_ja: "エターナルライト",
        song_link: { url: "https://youtube.com/watch?v=example3" },
        song_cover: {
          url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
          alt: "Eternal Light"
        }
      }
    ]
  }
};

// Function to get a random artist based on the day (for daily rotation)
// Uses Tokyo timezone (JST, UTC+9) as the base for determining the day
function getDailyArtist(artists) {
  if (!artists || artists.length === 0) return null;
  
  // Get current date in Tokyo timezone (Asia/Tokyo, JST, UTC+9)
  const now = new Date();
  const tokyoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  
  // Extract date components from Tokyo timezone
  const year = parseInt(tokyoDate.find(part => part.type === 'year').value);
  const month = parseInt(tokyoDate.find(part => part.type === 'month').value) - 1; // Month is 0-indexed
  const day = parseInt(tokyoDate.find(part => part.type === 'day').value);
  
  // Create date string for consistent daily selection
  const dateString = `${year}-${month}-${day}`;
  
  // Simple hash function to convert date to number
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % artists.length;
  return artists[index];
}

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default async function ArtistHighlight() {
  try {
    const client = createClient();
    
    // Fetch artists with "Highlight" tag
    const allArtists = await client.getAllByType("artist", {
      fetchOptions: {
        next: { 
          tags: ["prismic", "artists"],
          revalidate: false // Cached until the Prismic webhook invalidates this tag
        },
      },
      filters: [
        prismic.filter.at("document.tags", ["Highlight"]),
      ],
    });
    
    // Filter for active artists (where disband is null or empty)
    const activeArtists = allArtists.filter(artist => 
      !artist.data.disband || artist.data.disband === "" || artist.data.disband === null
    );
    
    const featuredArtist = getDailyArtist(activeArtists);
    
    if (!featuredArtist || !featuredArtist.data) {
      return null;
    }

    const {
      name_en = null,
      name_jp = null,
      debut = null,
      profile_picture = null,
      description = null,
      website = null,
      twitter = null,
      instagram = null,
      youtube = null,
      tiktok = null,
      song_list = [],
      youtube_video = null
    } = featuredArtist.data;

    const artistDisplayName = name_en || name_jp || "";
    const searchUrl = `/search?keyword=${encodeURIComponent(artistDisplayName)}`;
    
    // Get first 3 songs for display
    const recommendedSongs = song_list.slice(0, 3);
    
    // Check if we have a YouTube video to embed
    // Priority: youtube_video field > first song link > youtube social link
    let youtubeVideoId = null;
    if (youtube_video) {
      youtubeVideoId = extractYouTubeId(youtube_video);
    } else if (recommendedSongs.length > 0 && recommendedSongs[0].song_link?.url) {
      youtubeVideoId = extractYouTubeId(recommendedSongs[0].song_link.url);
    } else if (youtube?.url) {
      youtubeVideoId = extractYouTubeId(youtube.url);
    }

    return (
      <div className={styles.ArtistHighlightWrapper}>
        <div className={styles.ArtistHighlight}>
          {/*<div className={styles.stamp}>
            <div className={styles.sunShape}></div>
            <div className={styles.stampInner}>
              <div className={styles.gradientRing}></div>
              <div className={styles.stampText}>
                <span className={styles.stampTextEn}>Artist Highlight</span>
                <span className={styles.stampTextJa}>アーティスト<br />ハイライト</span>
              </div>
            </div>
          </div> */}

          <SeamlessTicker reverse={true} />

          <div className={styles.content}>
            <div className={styles.leftSection}>
              <div className={styles.imageWrapper}>
                <SingleImage
                  image={profile_picture}
                  fallbackAlt={artistDisplayName}
                  color="white"
                />
              </div>
              <div className={styles.socialLinks}>
                {website?.url && website.url !== "null" && (
                  <PrismicNextLink field={website} className={styles.socialLink}>
                    <HiOutlineLink />
                  </PrismicNextLink>
                )}
                {twitter?.url && twitter.url !== "null" && (
                  <PrismicNextLink field={twitter} className={styles.socialLink}>
                    <FaXTwitter />
                  </PrismicNextLink>
                )}
                {instagram?.url && instagram.url !== "null" && (
                  <PrismicNextLink field={instagram} className={styles.socialLink}>
                    <FaInstagram />
                  </PrismicNextLink>
                )}
                {youtube?.url && youtube.url !== "null" && (
                  <PrismicNextLink field={youtube} className={styles.socialLink}>
                    <FaYoutube />
                  </PrismicNextLink>
                )}
                {tiktok?.url && tiktok.url !== "null" && (
                  <PrismicNextLink field={tiktok} className={styles.socialLink}>
                    <FaTiktok />
                  </PrismicNextLink>
                )}
              </div>
            </div>

            <div className={styles.middleSection}>
              <div className={styles.likeSection}>
                <ArtistLike 
                  artistName={artistDisplayName} 
                  initialLikeCount={0}
                  hasServerData={false}
                />
              </div>
              <div className={styles.artistInfo}>
                <div className={styles.artistName}>
                  <h3 className={styles.nameEn}>{name_en}</h3>
                  {name_jp && (
                    <h4 className={styles.nameJp}>{name_jp}</h4>
                  )}
                </div>

                {debut && (
                  <div className={styles.debutDate}>
                    <span className={styles.label}>Debuted:</span>
                    <span className={styles.value}>{debut}</span>
                  </div>
                )}

                {description && (
                  <div className={styles.description}>
                    <PrismicRichText field={description} />
                  </div>
                )}
              </div>
              <div className={styles.ctaSection}>
                <Link href={searchUrl} className={styles.ctaLink}>
                  <Button
                    variant={"Pink"}
                    textValue={"See all articles"}
                    icon={<IoArrowForwardOutline />}
                  />
                </Link>
                <div className={styles.likeSection}>
                  <ArtistLike 
                    artistName={artistDisplayName} 
                    initialLikeCount={0}
                    hasServerData={false}
                  />
                </div>
              </div>
            </div>

            {(youtubeVideoId || recommendedSongs.length > 0) && (
              <div className={styles.rightSection}>
                {youtubeVideoId && (
                  <div className={styles.songsSection}>
                    <h4 className={styles.sectionTitle}>Featured Video</h4>
                    <div className={styles.videoWrapper}>
                      <YoutubeEmbed videoId={youtubeVideoId} />
                    </div>
                  </div>
                )}

                {recommendedSongs.length > 0 && (
                  <div className={styles.songsSection}>
                    <h4 className={styles.sectionTitle}>Recommended Songs</h4>
                    <div className={styles.songsGrid}>
                      {recommendedSongs.map((song, index) => {
                        const songYoutubeId = song.song_link?.url 
                          ? extractYouTubeId(song.song_link.url) 
                          : null;
                        
                        return (
                          song.song_link?.url ? (
                            <PrismicNextLink
                              key={index}
                              field={song.song_link}
                              className={styles.songCard}
                            >
                              {song.song_cover?.url ? (
                                <div className={styles.songImage}>
                                  <SingleImage
                                    image={song.song_cover}
                                    alt={song.song_cover.alt || song.song_title_en || "Song cover"}
                                    color="white"
                                  />
                                </div>
                              ) : (
                                <div className={styles.songImagePlaceholder}></div>
                              )}
                              <div className={styles.songInfo}>
                                <h5 className={styles.songTitleEn}>{song.song_title_en}</h5>
                                {song.song_title_ja && (
                                  <p className={styles.songTitleJa}>{song.song_title_ja}</p>
                                )}
                              </div>
                              <div className={styles.playIcon}>
                                <FaPlay />
                              </div>
                            </PrismicNextLink>
                          ) : (
                            <div key={index} className={styles.songCard}>
                              {song.song_cover?.url ? (
                                <div className={styles.songImage}>
                                  <SingleImage
                                    image={song.song_cover}
                                    alt={song.song_cover.alt || song.song_title_en || "Song cover"}
                                    color="white"
                                  />
                                </div>
                              ) : (
                                <div className={styles.songImagePlaceholder}></div>
                              )}
                              <div className={styles.songInfo}>
                                <h5 className={styles.songTitleEn}>{song.song_title_en}</h5>
                                {song.song_title_ja && (
                                  <p className={styles.songTitleJa}>{song.song_title_ja}</p>
                                )}
                              </div>
                            </div>
                          )
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <SeamlessTicker reverse={false} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching artist highlight:', error);
    return null;
  }
}

