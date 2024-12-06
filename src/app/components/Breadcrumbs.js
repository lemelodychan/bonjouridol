"use client";

import React from "react";
import Link from "next/link";
import styles from "./Breadcrumbs.module.scss";

import { HiChevronRight } from "react-icons/hi";

const Breadcrumbs = ({ category, title, subtitle, uid }) => {

    let parentCat;
    if (category === "Live report") {
        parentCat = "livereports";
    } else if (category === "Discovery") {
        parentCat = "discovery";
    } else if (category === "Press release") {
        parentCat = "pressrelease";
    } else if (category === "Gallery") {
        parentCat = "gallery";
    }

    return (
    <div className={styles.Breadcrumbs}>
        <Link 
            href={`/`} >
            Home
        </Link>
        <HiChevronRight />
        <Link 
            href={`/${parentCat}`} >
            {category}
        </Link>
        <HiChevronRight />
        <a className={styles.active}>{title}: {subtitle}</a>
    </div>
)};

export default Breadcrumbs;