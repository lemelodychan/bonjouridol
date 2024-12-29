import styles from "./Footer.module.scss";
import Link from "next/link.js";

import { IoArrowForwardOutline } from "react-icons/io5";
import { HiOutlineLink } from 'react-icons/hi';
import { FaInstagram } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";
import { FaYoutube } from "react-icons/fa6";

export default function Footer() {
    return (
        <div className={styles.Footer}>
            <div className={styles.SocialLinks}>
                <Link 
                    href="https://x.com/bonjour_idol"
                    style={{ '--width': '75px' }}
                >
                    <FaXTwitter />
                    <span><span>Twitter</span></span>
                </Link>
                <Link 
                    href="https://www.instagram.com/bonjour_idol/"
                    style={{ '--width': '97px' }}
                >
                    <FaInstagram />
                    <span><span>Instagram</span></span>
                </Link>
                <Link 
                    href="https://www.youtube.com/@bonjouridol"
                    style={{ '--width': '79px' }}
                >
                    <FaYoutube />
                    <span><span>Youtube</span></span>
                </Link>
            </div>
            <div className={styles.Credits}>
                BONJOUR IDOL © Copyright 2018-2025.  All Rights Reserved.
            </div>
        </div>
    )
}