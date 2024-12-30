"use client";

import { useState, useEffect } from "react";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import LogoDesktop from "../assets/logo_croissant_pink.svg";
import LogoMobileWhite from "../assets/logo_croissant_white.svg";
import LogoMobilePink from "../assets/logo_croissant_pink.svg";
import LogoMobileMenu from "../assets/logo_normal_white.svg";

import Menu from "./Menu";
import styles from "./navbar.module.scss";

export default function Navbar() {
  const pathname = usePathname();
  const isArticleOrHomePage = pathname === "/" || pathname.startsWith("/articles");

  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setScrolled] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
    document.body.classList.toggle("overflowHidden", !isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    document.body.classList.remove("overflowHidden");
  };

  useEffect(() => {
    if (isArticleOrHomePage) {
      const handleScroll = () => setScrolled(window.scrollY > 640);
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [isArticleOrHomePage]);

  return (
    <div className={styles.navigation}>
      {/* Fixed Mobile Menu Icon */}
      <button
        onClick={toggleMobileMenu}
        className={`${styles.mobileMenuButton} ${
            isMobileMenuOpen
              ? ""
              : isScrolled || !isArticleOrHomePage
              ? styles.whiteBackground
              : ""
          }`}
        >
            {isMobileMenuOpen ? (
                <HiX className={styles.mobileIcon} />
            ) : (
                <HiMenuAlt3
                className={`${styles.mobileIcon} ${
                    isScrolled || !isArticleOrHomePage ? styles.pinkIcon : styles.whiteIcon
                }`}
                />
            )}
        </button>


      {/* Desktop Menu */}
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
              src={!isArticleOrHomePage ? LogoMobilePink : LogoMobileWhite}
              alt="BONJOUR IDOL"
              height={32}
              style={{ display: isMobileMenuOpen ? "none" : "block" }}
            />
          </Link>
        </div>

        <nav className={`${styles.navbar} ${styles.desktopNav}`} role="navigation">
          <Menu />
        </nav>
      </div>

      {/* Mobile Full-Screen Menu */}
      <div
        className={styles.mobileMenu}
        style={{ display: isMobileMenuOpen ? "block" : "none" }}
      >
        <nav className={styles.navbar} role="navigation">
          <Link href="/" className={styles.logo}>
            <Image
              priority
              src={LogoMobileMenu}
              alt="BONJOUR IDOL"
              height={80}
            />
          </Link>
          <Menu onLinkClick={closeMobileMenu} />
        </nav>
      </div>
    </div>
  );
}