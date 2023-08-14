import { PrismicImage, PrismicLink, PrismicText, useAllPrismicDocumentsByType } from '@prismicio/react'

import Button from './IconButton.js';
import { IoArrowForwardOutline } from "react-icons/io5";

import './HeroArticle.scss';

function HeroArticle() {
    const results = useAllPrismicDocumentsByType("articles");
    const latestPost = results[0]

    console.log('latest Post',latestPost);
    
    return (
        <div className="Hero">
            <div className="Content">
                <div className="Tags">
                    {latestPost && (
                        <span className="Tag">{latestPost[0].tags[0]}</span>
                    )}
                    {latestPost && (
                        <span className="Tag">{latestPost[0].tags[1]}</span>
                    )}
                </div>
                {latestPost && (
                    <h1>
                        <span>
                            <PrismicText field={latestPost[0].data.title} />
                        </span>
                    </h1>
                )}
                {latestPost && (
                    <a href={latestPost[0].uid}>
                        <Button variant={"mainPink"} textValue={"Read more"} icon={<IoArrowForwardOutline />} />
                    </a>
                )}
            </div>
            <div className="FeaturedImage">
                {latestPost && (
                    <PrismicImage field={latestPost[0].data.featured_image} />
                )}
            </div>
        </div>
    );
}

export default HeroArticle;