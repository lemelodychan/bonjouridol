"use client";

import React from 'react';
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import styles from './Author.module.scss';

import { HiOutlineLink } from 'react-icons/hi';
import { FaInstagram } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";

const Author = ({ author, type }) => {
    const { 
        name, 
        profile_picture, 
        description, 
        twitter, 
        instagram, 
        website } = author.data;

    return (
        <div className={styles.AuthorBlock}>
            {profile_picture && (
                <span className={styles.authorImg}>
                    <PrismicNextImage
                        field={profile_picture}
                        alt={`${name}'s Profile Picture`}
                        width={100}
                        height={100}
                    />
                </span>
            )}
            <div className={styles.AuthorInfo}>
                <h4>
                    {type} by&nbsp;
                    <span className={styles.AuthorName}>{name}</span>
                </h4>
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