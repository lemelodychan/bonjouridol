"use client"
import { useState } from "react";

import styles from "./Menu.module.scss";
import Link from "next/link.js";
import { usePathname} from 'next/navigation';

export default function Menu() {

    const pathname = usePathname();

    return (
        <>
            <ul className={styles.menuContent}>
                <li>
                    <Link 
                        href="/livereports"
                        className={pathname == "/livereports" ? "active" : ""} >
                            Live Reports
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/discoveries"
                        className={pathname == "/discoveries" ? "active" : ""} >
                            Discoveries
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/pressrelease"
                        className={pathname == "/pressrelease" ? "active" : ""} >
                            Press Release
                    </Link>
                </li>
                <li>
                    <Link 
                        href="/galleries"
                        className={pathname == "/galleries" ? "active" : ""} >
                            Galleries
                    </Link>
                </li>
            </ul>
        </>
    )
}