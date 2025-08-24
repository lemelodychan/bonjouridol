import { createClient } from "@/prismicio";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";
import SingleImage from "./SingleImage";
import Button from "./IconButton";

import styles from "./MemberListContent.module.scss";

import { HiOutlineLink } from 'react-icons/hi';
import { FaInstagram } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";
import { IoArrowForwardOutline } from "react-icons/io5";

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

    return (
        <div className={styles.MemberList}>
            {members.map((member) => {
                const { profile_picture, name, description, specialization, twitter, instagram, website } = member.data;

                return (
                    <div key={member.id} className={styles.MemberCard}>
                        {profile_picture && (
                            <div className={styles.ProfilePicture}>
                                <SingleImage 
                                    image={profile_picture}
                                    alt={`${name}'s Profile Picture` || "Member profile picture"}
                                    color="GreyBg"
                                />
                            </div>
                        )}
                        <h3 className={styles.Name}>
                            {name}
                        </h3>
                        <span className={styles.Specialization}>{specialization}</span>
                        <div className={styles.Description}>
                            {description.length > 0 && (
                                <PrismicRichText field={description} />
                            )}
                        </div>

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

                        <div className={styles.ButtonContainer}>
                            <Button 
                                href={`/search?keyword=${encodeURIComponent(name)}&author=true`}
                                variant="Grey"
                                textValue="See all their work"
                                icon={<IoArrowForwardOutline />}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
