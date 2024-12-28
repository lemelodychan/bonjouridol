import { createClient } from "@/prismicio";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";

import styles from "./MemberListContent.module.scss";

import { HiOutlineLink } from 'react-icons/hi';
import { FaInstagram } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";

export default async function MemberListContent() {
    const client = createClient();

    const members = await client.getAllByType("author", {
        fetchOptions: {
            cache: "no-store",
            next: { tags: ["prismic", "authors"] },
        },
        orderings: [
            {
                field: "my.author.display_order",
                direction: "asc",
            },
        ],
    });

    console.log(members);

    return (
        <div className={styles.MemberList}>
            {members.map((member) => {
                const { profile_picture, name, description, specialization, twitter, instagram, website } = member.data;

                return (
                    <div key={member.id} className={styles.MemberCard}>
                        {profile_picture && (
                            <div className={styles.ProfilePicture}>
                                <PrismicNextImage
                                    field={profile_picture}
                                    alt={`${name}'s profile picture`}
                                    fallbackAlt=""
                                />
                            </div>
                        )}
                        <h3 className={styles.Name}>
                            {name}
                        </h3>
                        <span>{specialization}</span>
                        {description.length > 0 && (
                            <div className={styles.Description}>
                                <PrismicRichText field={description} />
                            </div>
                        )}

                        <div className={styles.SocialLinks}>
                            {twitter && twitter.url && (
                                <PrismicNextLink field={twitter}>
                                    <FaXTwitter />
                                </PrismicNextLink>
                            )}
                            {instagram && instagram.url && (
                                <PrismicNextLink field={instagram}>
                                    <FaInstagram />
                                </PrismicNextLink>
                            )}
                            {website && website.url && ( 
                                <PrismicNextLink field={website}>
                                    <HiOutlineLink />
                                </PrismicNextLink>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
