"use client"
import { useState } from "react";

import LogoDesktop from "../assets/logo_croissant_pink.svg";
import LogoMobile from "../assets/logo_croissant_white.svg";

import Image from 'next/image';
import styles from "./navbar.module.scss";
import Link from "next/link.js";
import { usePathname} from 'next/navigation';

import { HiMenuAlt3 } from "react-icons/hi";

export default function Navbar() {

    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const toggle = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={styles.menu}>
            <div className={styles.logo}>
                <Link href="/">
                    <Image
                        className={styles.desktop}
                        priority
                        src={LogoDesktop}
                        alt="BONJOUR IDOL"
                        height={44}
                    />
                    <Image
                        className={styles.mobile}
                        priority
                        src={LogoMobile}
                        alt="BONJOUR IDOL"
                        height={32}
                    />
                </Link>
            </div>

            <nav className={styles.navbar} role="navigation">
                <ul>
                    <li className={styles.item}>
                        <Link 
                            href="/"
                            className={pathname == "/" ? "active" : ""} >
                                Home
                        </Link>
                    </li>
                    <li>
                        <Link 
                            href="/livereports"
                            className={pathname == "/" ? "active" : ""} >
                                Live Reports
                        </Link>
                    </li>
                    <li>
                        <Link 
                            href="/discoveries"
                            className={pathname == "/" ? "active" : ""} >
                                Discoveries
                        </Link>
                    </li>
                    <li>
                        <Link 
                            href="/pressrelease"
                            className={pathname == "/" ? "active" : ""} >
                                Press Release
                        </Link>
                    </li>
                    <li>
                        <Link 
                            href="/galleries"
                            className={pathname == "/" ? "active" : ""} >
                                Galleries
                        </Link>
                    </li>
                </ul>
            </nav>
            <button className={styles.mobilemenu}>
                <HiMenuAlt3 />
            </button>
        </div>
    )
}