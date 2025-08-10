"use client"
import { useState } from "react";

import styles from "./Menu.module.scss";
import Link from "next/link.js";

import { IoArrowForwardOutline } from "react-icons/io5";

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
                            <span>Live Reports</span>
                            <span className={styles.Icon}>
                                <IoArrowForwardOutline />
                            </span>
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/features"
                        onClick={onLinkClick}
                        className={pathname == "/features" ? "active" : ""} >
                            <span>Features</span>
                            <span className={styles.Icon}>
                                <IoArrowForwardOutline />
                            </span>
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/discoveries"
                        onClick={onLinkClick}
                        className={pathname == "/discoveries" ? "active" : ""} >
                            <span>Discoveries</span>
                            <span className={styles.Icon}>
                                <IoArrowForwardOutline />
                            </span>
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/pressrelease"
                        onClick={onLinkClick}
                        className={pathname == "/pressrelease" ? "active" : ""} >
                            <span>Press Release</span>
                            <span className={styles.Icon}>
                                <IoArrowForwardOutline />
                            </span>
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/galleries"
                        onClick={onLinkClick}
                        className={pathname == "/galleries" ? "active" : ""} >
                            <span>Galleries</span>
                            <span className={styles.Icon}>
                                <IoArrowForwardOutline />
                            </span>
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/directory"
                        onClick={onLinkClick}
                        className={pathname == "/directory" ? "active" : ""} >
                            <span>Artist Directory</span>
                            <span className={styles.Icon}>
                                <IoArrowForwardOutline />
                            </span>
                    </Link>
                </li>
            </ul>

            <ul className={styles.menuSecondary}>
                <li>
                    <Link 
                        href="/about"
                        onClick={onLinkClick}
                        className={pathname == "/about" ? "active" : ""} >
                            <span>About</span>
                            <span className={styles.Icon}>
                                <IoArrowForwardOutline />
                            </span>
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/contact"
                        onClick={onLinkClick}
                        className={pathname == "/contact" ? "active" : ""} >
                            <span>Contact</span>
                            <span className={styles.Icon}>
                                <IoArrowForwardOutline />
                            </span>
                    </Link>
                </li>
                <li>
                    <Link 
                        href="https://habatake.bonjouridol.com/"
                        onClick={onLinkClick}
                        target="_blank" >
                            <span>アイドル・事務所へ</span>
                            <span className={styles.Icon}>
                                <IoArrowForwardOutline />
                            </span>
                    </Link>
                </li>
            </ul>
        </div>
    )
}