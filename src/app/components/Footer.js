import styles from "./Footer.module.scss";
import Link from "next/link.js";

import { IoArrowForwardOutline } from "react-icons/io5";
import { HiOutlineLink } from 'react-icons/hi';
import { FaInstagram } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";
import { FaYoutube } from "react-icons/fa6";
import { FaTiktok } from "react-icons/fa6";

export default function Footer() {
    return (
        <div className={styles.Footer}>
            <div className={styles.SocialLinks}>
                <Link 
                    href="https://x.com/bonjour_idol"
                    style={{ '--width': '75px' }}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <FaXTwitter />
                    <span><span>Twitter</span></span>
                </Link>
                <Link 
                    href="https://www.instagram.com/bonjour_idol/"
                    style={{ '--width': '97px' }}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <FaInstagram />
                    <span><span>Instagram</span></span>
                </Link>
                <Link 
                    href="https://www.tiktok.com/@bonjour_idol"
                    style={{ '--width': '64px' }}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <FaTiktok />
                    <span><span>TikTok</span></span>
                </Link>
                <Link 
                    href="https://www.youtube.com/@bonjouridol"
                    style={{ '--width': '79px' }}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <FaYoutube />
                    <span><span>Youtube</span></span>
                </Link>
                <a 
                    style={{ 'backgroundColor': '#202020', 'padding': 0, 'margin': 0, 'borderRadius': 8 }}
                    href="https://ko-fi.com/bonjouridol" 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    <img 
                        height="36" 
                        style={{border: 0, height: 36}} 
                        src="https://cdn.prod.website-files.com/5c14e387dab576fe667689cf/670f5a02fcf48af59c591185_support_me_on_kofi_dark.png" 
                        alt="Buy Me a Coffee at ko-fi.com" 
                    />
                </a>
            </div>
            <div className={styles.Credits}>
                BONJOUR IDOL © Copyright 2018-2026.  All Rights Reserved.
            </div>
        </div>
    )
}