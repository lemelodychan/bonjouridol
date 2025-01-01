import styles from "./Topbar.module.scss";
import Link from "next/link.js";

import { IoArrowForwardOutline } from "react-icons/io5";

export default function Topbar() {
    return (
        <div className={styles.Topbar}>
            <div>
                <Link href="/about">
                    <span>About</span>
                    <span className={styles.Icon}>
                        <IoArrowForwardOutline />
                    </span>
                </Link>
                <Link href="/contact">
                    <span>Contact</span>
                    <span className={styles.Icon}>
                        <IoArrowForwardOutline />
                    </span>
                </Link>
                <Link href="https://archives.bonjouridol.com/" target="_blank">
                    <span>Archives</span>
                    <span className={styles.Icon}>
                        <IoArrowForwardOutline />
                    </span>
                </Link>

                {/* <Link href="/">
                    <span>Français</span>
                    <span className={styles.Icon}>
                        <IoArrowForwardOutline />
                    </span>
                </Link> */}
            </div>
        </div>
    )
}