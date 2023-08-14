import Logo from "../assets/logo_normal_white.svg";
import Image from 'next/image';
import styles from "./navbar.module.scss"

export default function Navbar() {
    return (
        <div className={styles.menu}>
            <div className={styles.logo}>
            <Image
                priority
                src={Logo}
                alt="Bonjour Idol Logo"
                />
            </div>

            <nav className={styles.navbar} role="navigation">
                Menu ici
            </nav>
        </div>
    )
}