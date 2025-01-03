"use client";

import React from "react";
import Link from "next/link";
import styles from "./Breadcrumbs.module.scss";

import { HiChevronRight } from "react-icons/hi";

const Breadcrumbs = ({ category, title = null, subtitle = null, uid = null, type }) => {
    
    let parentCat;
    let titleCat;
    if (category === "Live report") {
        parentCat = "livereports";
        titleCat = "Live Reports";
    } else if (category === "Interview") {
        parentCat = "features";
        titleCat = "Features";
    } else if (category === "Behind the scenes") {
        parentCat = "features";
        titleCat = "Features";
    } else if (category === "Discovery") {
        parentCat = "discoveries";
        titleCat = "Discoveries";
    } else if (category === "Press release") {
        parentCat = "pressrelease";
        titleCat = "Press Releases";
    } else if (category === "Gallery") {
        parentCat = "galleries";
        titleCat = "Galleries";
    } else if (category === "Features") {
        parentCat = "features";
        titleCat = "Features";
    } else if (category === "Search results") {
        parentCat = "livereports";
        titleCat = "All articles";
    }

    return (
        <div
            className={`${styles.Breadcrumbs} ${type === "white" ? styles.white : ""}`}
        >
            <Link href={`/`}>
                Home
            </Link>
            <HiChevronRight />
            <Link href={`/${parentCat}`}>
                {titleCat}
            </Link>
            {title && subtitle && uid && (
                <>
                    <HiChevronRight />
                    <a className={styles.active}>
                        {title}: {subtitle}
                    </a>
                </>
            )}
        </div>
    );
};

export default Breadcrumbs;