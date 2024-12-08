"use client";

import React from "react";
import Link from "next/link";
import styles from "./Breadcrumbs.module.scss";

import { HiChevronRight } from "react-icons/hi";

const Breadcrumbs = ({ category, title, subtitle, uid, type }) => {

    let parentCat;
    let titleCat;
    if (category === "Live report") {
        parentCat = "livereports";
        titleCat = "Live Reports";
    } else if (category === "Discovery") {
        parentCat = "discoveries";
        titleCat = "Discoveries";
    } else if (category === "Press release") {
        parentCat = "pressrelease";
        titleCat = "Press Releases";
    } else if (category === "Gallery") {
        parentCat = "galleries";
        titleCat = "Galleries";
    }

    return (
    <div 
        className={`${styles.Breadcrumbs} ${type === "white" ? styles.white : ""}`}
    >
        <Link 
            href={`/`} >
            Home
        </Link>
        <HiChevronRight />
        <Link 
            href={`/${parentCat}`} >
            {titleCat}
        </Link>
        <HiChevronRight />
        <a className={styles.active}>{title}: {subtitle}</a>
    </div>
)};

export default Breadcrumbs;