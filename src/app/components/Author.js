"use client";

import React from 'react';
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import Image from 'next/image';
import styles from './Author.module.scss';

import { HiOutlineLink } from 'react-icons/hi';
import { FaInstagram } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";

const Author = ({ author, author2, type, translator }) => {
    const {
        name = "Bonjour Idol", 
        profile_picture = null, 
        description = null, 
        twitter = null, 
        instagram = null, 
        website = null,
    } = author?.data || {};   

    const {
        name: name2, 
        profile_picture: profile_picture2,
    } = author2?.data || {};

    return (
        <div className={styles.AuthorBlock}>
            <div className={`${styles.authorImgContainer} ${author2?.data ? styles.withAuthor2 : ""}`}>
                {profile_picture ? (
                    <span className={styles.authorImg}>
                        <PrismicNextImage
                            field={profile_picture}
                            fallbackAlt=""
                            width={100}
                            height={100}
                        />
                    </span>
                    ) : (
                    <span className={styles.authorImg}>
                        <Image
                            src={'/LogoBI.png'}
                            alt="Bonjour Idol Logo"
                            width={100}
                            height={100}
                            priority
                        />
                    </span>
                )}
                {profile_picture2 && (
                        <span className={styles.authorImg}>
                            <PrismicNextImage
                                field={profile_picture2}
                                alt={`${name2}'s Profile Picture`}
                                fallbackAlt=""
                                width={100}
                                height={100}
                            />
                        </span>
                )}
            </div>

            <div className={styles.AuthorInfo}>

            
            {translator ? (
                <>
                    <h4>
                        {type} by&nbsp;
                        <span className={styles.AuthorName}>{name}</span>
                    </h4>
                    <span className={styles.Translation} dangerouslySetInnerHTML={{ __html: translator }} />
                </>
                ) : (
                <h4>
                    {type} by&nbsp;
                    <span className={styles.AuthorName}>{name}</span>
                    {name2 && (
                        <>
                            &nbsp;and <span className={styles.AuthorName}>{name2}</span>
                        </>
                    )}
                </h4>
            )}
                {description && 
                    <div className={styles.Description}>
                        <PrismicRichText field={description} />
                    </div>
                }
                <div className={styles.SocialLinks}>
                    {twitter && 
                        <PrismicNextLink field={twitter}>
                            <FaXTwitter />
                        </PrismicNextLink>
                    }
                    {instagram && 
                        <PrismicNextLink field={instagram}>
                            <FaInstagram />
                        </PrismicNextLink>
                    }
                    {website && 
                        <PrismicNextLink field={website}>
                            <HiOutlineLink />
                        </PrismicNextLink>
                    }
                </div>
            </div>
        </div>
    );
};

export default Author;