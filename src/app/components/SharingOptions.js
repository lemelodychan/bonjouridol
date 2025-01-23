"use client"
import { TwitterShareButton, TwitterIcon, LineShareButton, LineIcon, RedditShareButton, RedditIcon } from "next-share";
import styles from "./SharingOptions.module.scss";

export default function SharingOptions(props) {
    const { uid = "", title = "Untitled", idol = "" } = props;

    const processIdolName = (idol) => {
        const name = idol || "";
        const isJapanese = /^[\u3040-\u30FF\u4E00-\u9FFF]+$/.test(name);
        if (isJapanese) {
            return name;
        }
        return name.replace(/[\W_]/g, "").toLowerCase();
    };

    const idolName = processIdolName(idol);

    return (
        <div className={styles.Sharing}>
            <TwitterShareButton
                url={`https://www.bonjouridol.com/articles/${uid}`}
                title={`${title} | BONJOUR IDOL #bonjouridol #${idolName}`}
            >
                <TwitterIcon size={32} round />
            </TwitterShareButton>
            <LineShareButton
                url={`https://www.bonjouridol.com/articles/${uid}`}
                title={`${title} | BONJOUR IDOL #bonjouridol #${idolName}`}
            >
                <LineIcon size={32} round />
            </LineShareButton>
            <RedditShareButton
                url={`https://www.bonjouridol.com/articles/${uid}`}
                title={`${title} | BONJOUR IDOL #bonjouridol #${idolName}`}
            >
                <RedditIcon size={32} round />
            </RedditShareButton>
        </div>
    );
}
