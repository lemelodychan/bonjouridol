'use client';

import { useRouter } from "next/navigation";
import { PrismicNextImage } from "@prismicio/next"
import { PrismicLink, PrismicRichText } from "@prismicio/react"
import { PrismicNextLink } from "@prismicio/next";
import styles from "./ArtistProfile.module.scss"

import SingleImage from "./SingleImage";
import ArtistLike from "./ArtistLike";

import { FaInstagram, FaTwitter } from "react-icons/fa6";
import { HiOutlineLink } from 'react-icons/hi';
import { FaXTwitter } from "react-icons/fa6";
import { FaYoutube } from "react-icons/fa6";
import { FaTiktok } from "react-icons/fa6";
import Link from "next/link";
import Button from "./IconButton";
import { IoArrowForwardOutline } from "react-icons/io5";

export default function ArtistProfile({ artist, noConstraints = false, hideDescription = false, likeCounts = {}, viewMode = 'card' }) {
    const router = useRouter();
    const {
        name_en = null, 
        name_jp = null,
        debut = null,
        disband = null,
        profile_picture = null, 
        description = null, 
        website = null,
        twitter = null, 
        instagram = null, 
        youtube = null,
        tiktok = null,
    } = artist?.data || {};   

    const artistDisplayName = name_en || name_jp || "";
    const searchUrl = `/search?keyword=${encodeURIComponent(artistDisplayName)}`;

    // Handle row click navigation
    const handleRowClick = (e) => {
        // Don't navigate if clicking on social links or like button
        if (e.target.closest(`.${styles.social}`) || e.target.closest(`.${styles.likeSection}`)) {
            return;
        }
        router.push(searchUrl);
    };

    const rowContent = (
        <>
            <SingleImage 
                image={artist.data.profile_picture}
                fallbackAlt=""
                className={styles.profilePic}
                color="white"
            />
            <div className={styles.profileContent}>
            <div className={styles.profileName}>
                <h2>{artist.data.name_en}</h2>
                {artist.data.name_jp &&
                    <h3>{artist.data.name_jp}</h3>
                }
            </div>
            <div className={styles.info}>
                {artist.data.debut &&
                    <span><strong>Debuted:</strong> {artist.data.debut}</span>
                }
                {artist.data.disband && 
                    <span><strong>Disbanded:</strong> {artist.data.disband}</span>
                }
            </div>
            {!hideDescription && (
                <div className={styles.description}>
                    <PrismicRichText field={artist.data.description} />
                </div>
            )}
            <div className={styles.social} onClick={(e) => e.stopPropagation()}>
            {artist.data.website && artist.data.website.url && artist.data.website.url !== "null" && (
                <PrismicNextLink field={artist.data.website}>
                    <HiOutlineLink />
                </PrismicNextLink>
            )}
            {artist.data.twitter && artist.data.twitter.url && artist.data.twitter.url !== "null" && (
                <PrismicNextLink field={artist.data.twitter}>
                    <FaXTwitter />
                </PrismicNextLink>
            )}
            {artist.data.instagram && artist.data.instagram.url && artist.data.instagram.url !== "null" && (
                <PrismicNextLink field={artist.data.instagram}>
                    <FaInstagram />
                </PrismicNextLink>
            )}
            {artist.data.youtube && artist.data.youtube.url && artist.data.youtube.url !== "null" && (
                <PrismicNextLink field={artist.data.youtube}>
                    <FaYoutube />
                </PrismicNextLink>
            )}
            {artist.data.tiktok && artist.data.tiktok.url && artist.data.tiktok.url !== "null" && (
                <PrismicNextLink field={artist.data.tiktok}>
                    <FaTiktok />
                </PrismicNextLink>
            )}
            </div>

            <div className={styles.ctaButton}>
                {viewMode !== 'row' && (
                    <Button href={searchUrl} className={styles.ctaButton} variant={"White"} textValue={'See all articles'} icon={<IoArrowForwardOutline />} />
                )}
                <div className={styles.likeSection} onClick={(e) => e.stopPropagation()}>
                    <ArtistLike 
                        artistName={artistDisplayName} 
                        initialLikeCount={likeCounts[artistDisplayName] || 0}
                        hasServerData={likeCounts.hasOwnProperty(artistDisplayName)}
                    />
                </div>
            </div>
      </div>
        </>
    );

    if (viewMode === 'row') {
        return (
            <div 
                className={`${styles.artistProfile} ${noConstraints ? styles.noConstraints : ""} ${styles.rowView}`}
                onClick={handleRowClick}
            >
                {rowContent}
            </div>
        );
    }

    return (
        <div className={`${styles.artistProfile} ${noConstraints ? styles.noConstraints : ""}`}>
            {rowContent}
        </div>
    );
}

