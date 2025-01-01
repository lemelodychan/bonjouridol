"use client"
import { useState } from "react";

import styles from "./Menu.module.scss";
import Link from "next/link.js";

import { usePathname} from 'next/navigation';

export default function Menu({ onLinkClick }) {

    const pathname = usePathname();

    return (
        <div className={styles.Menu}>
            <ul className={styles.menuContent}>
                <li>
                    <Link 
                        href="/livereports"
                        onClick={onLinkClick}
                        className={pathname == "/livereports" ? "active" : ""} >
                            Live Reports & Interviews
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/discoveries"
                        onClick={onLinkClick}
                        className={pathname == "/discoveries" ? "active" : ""} >
                            Discoveries
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/pressrelease"
                        onClick={onLinkClick}
                        className={pathname == "/pressrelease" ? "active" : ""} >
                            Press Release
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/galleries"
                        onClick={onLinkClick}
                        className={pathname == "/galleries" ? "active" : ""} >
                            Galleries
                    </Link>
                </li>
            </ul>

            <ul className={styles.menuSecondary}>
                <li>
                    <Link 
                        href="/about"
                        onClick={onLinkClick}
                        className={pathname == "/about" ? "active" : ""} >
                            About
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/contact"
                        onClick={onLinkClick}
                        className={pathname == "/contact" ? "active" : ""} >
                            Contact
                    </Link>
                </li>
                <li>
                    <Link 
                        href="https://archives.bonjouridol.com/"
                        target="_blank"
                        onClick={onLinkClick}>
                            Archives
                    </Link>
                </li>
            </ul>
        </div>
    )
}