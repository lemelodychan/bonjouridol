"use client"
import { useState } from "react";

import LogoDesktop from "../assets/logo_croissant_pink.svg";
import LogoMobile from "../assets/logo_croissant_white.svg";
import LogoMobileMenu from "../assets/logo_normal_white.svg";

import Image from 'next/image';
import styles from "./navbar.module.scss";
import Link from "next/link.js";
import { usePathname} from 'next/navigation';

import Menu from "./Menu"

import { HiMenuAlt3, HiX } from "react-icons/hi";

export default function Navbar() {

    const pathname = usePathname();

    const [showMe, setShowMe] = useState(false);
    function toggle(){
        setShowMe(!showMe);
        if (showMe === false) {
            document.querySelector("body").classList.add("overflowHidden");
        } else if (showMe === true) {
            document.querySelector("body").classList.remove("overflowHidden");
        };
    }

    return (
        <div className={styles.navigation}>
            <div className={styles.menu}>
                <div className={styles.logo}>
                    <Link href="/" className={styles.desktop}>
                        <Image
                            priority
                            src={LogoDesktop}
                            alt="BONJOUR IDOL"
                            height={44}
                        />
                    </Link>
                    <Link href="/" className={styles.mobile}>
                        <Image
                            priority
                            src={LogoMobile}
                            alt="BONJOUR IDOL"
                            height={32}
                            style={{ display: showMe?"none":"block" }}
                        />
                    </Link>
                </div>

                <nav className={styles.navbar} role="navigation">
                    <Menu />
                </nav>
                
                <button onClick={toggle} className={styles.mobilebutton}>
                    <HiMenuAlt3 style={{ display: showMe?"none":"block" }} />
                </button>
            </div>

            <div 
                className={styles.mobilemenu}
                style={{ display: showMe?"block":"none" }}
            >
                <button onClick={toggle} className={styles.mobilebutton}>
                    <HiX style={{ display: showMe?"block":"none" }} />
                </button>
                <nav className={styles.navbar} role="navigation">
                    <Link href="/" className={styles.logo}>
                        <Image
                            priority
                            src={LogoMobileMenu}
                            alt="BONJOUR IDOL"
                            height={80}
                        />
                    </Link>
                    <Menu />
                </nav>
            </div>
        </div>
    )
}