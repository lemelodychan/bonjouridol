import { PrismicImage, PrismicText,useAllPrismicDocumentsByType } from '@prismicio/react'

import '../App.scss';
import './LatestPosts.scss';

import { IoArrowForwardOutline } from "react-icons/io5";

import HeroArticle from './HeroArticle';
import Button from './IconButton.js';

function LatestPosts() {
    const results = useAllPrismicDocumentsByType("articles");
    const latestPosts = results[0]
    // console.log("Post 2:", latestPosts)
    
    return (
        <div className="LatestPosts">
            <HeroArticle />
            <div className="OtherPosts">
                <h2><span>Other Posts</span></h2>

                <a href="#" className="OtherPost" id="post2">
                    <div className="FeaturedImage">
                        {latestPosts && (
                            <PrismicImage field={latestPosts[1].data.featured_image} />
                        )}
                    </div>
                    <div className="Content">
                        <div className="Tags">
                            {latestPosts && (
                                <span className="Tag">{latestPosts[1].tags[0]}</span>
                            )}
                            {latestPosts && (
                                <span className="Tag">{latestPosts[1].tags[1]}</span>
                            )}
                        </div>
                        {latestPosts && (
                            <h3>
                                <span><PrismicText field={latestPosts[1].data.title} /></span>
                                <span className="icon"><IoArrowForwardOutline /></span>
                            </h3>
                        )}
                    </div>
                </a>

                <a href="https://bonjouridol.com/">
                    <Button variant={"mainPink"} textValue={"See more articles"} icon={<IoArrowForwardOutline />} />
                </a>

            </div>
        </div>
    );
}
  
export default LatestPosts;