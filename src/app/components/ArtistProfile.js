import { PrismicNextImage } from "@prismicio/next"
import { PrismicLink, PrismicRichText } from "@prismicio/react"
import { PrismicNextLink } from "@prismicio/next";
import styles from "./ArtistProfile.module.scss"

import SingleImage from "./SingleImage";


import { FaInstagram, FaTwitter } from "react-icons/fa6";
import { HiOutlineLink } from 'react-icons/hi';
import { FaXTwitter } from "react-icons/fa6";
import { FaYoutube } from "react-icons/fa6";
import { FaTiktok } from "react-icons/fa6";
import Link from "next/link";
import Button from "./IconButton";
import { IoArrowForwardOutline } from "react-icons/io5";

export default function ArtistProfile({ artist, noConstraints = false, hideDescription = false }) {
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

  return (
    <div className={`${styles.artistProfile} ${noConstraints ? styles.noConstraints : ""}`}>
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
            {!noConstraints && artist.data.debut && (
                <span><strong>Debuted:</strong> {artist.data.debut}</span>
            )}
            {artist.data.disband && 
                <span><strong>Disbanded:</strong> {artist.data.disband}</span>
            }
            {!hideDescription && (
                <div className={styles.description}>
                    <PrismicRichText field={artist.data.description} />
                </div>
            )}
            <div className={styles.social}>
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

            <Button href={searchUrl} className={styles.ctaButton} variant={"White"} textValue={'See all articles'} icon={<IoArrowForwardOutline />} />
      </div>
    </div>
  )
}

