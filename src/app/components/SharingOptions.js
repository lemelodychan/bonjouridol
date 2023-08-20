"use client"
import { TwitterShareButton, TwitterIcon } from 'next-share'

export default function SharingOptions(props) {
    const {uid} = props
    const {title} = props

    return (
        <>
            <TwitterShareButton
                url={`https://bonjouridol.vercel.app/articles/${uid}`}
                title={`${title} | BONJOUR IDOL`}
            >
                <TwitterIcon size={32} round />
            </TwitterShareButton>
        </>
    )
}