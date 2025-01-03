"use client";

import { useState, useEffect } from "react";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

import LogoDesktop from "../assets/logo_croissant_pink.svg";
import LogoMobileWhite from "../assets/logo_croissant_white.svg";
import LogoMobilePink from "../assets/logo_croissant_pink.svg";
import LogoMobileMenu from "../assets/logo_normal_white.svg";

import { FaXTwitter, FaInstagram, FaYoutube } from "react-icons/fa6";
import { IoArrowForwardOutline } from "react-icons/io5";
import { HiOutlineSearch } from "react-icons/hi";

import Menu from "./Menu";
import styles from "./navbar.module.scss";

export default function Navbar() {
  const pathname = usePathname();
  const isArticleOrHomePage = pathname === "/" || pathname.startsWith("/articles");

  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const handleSearch = (event) => {
    event.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?keyword=${encodeURIComponent(searchTerm)}`);
    }
  };

  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setScrolled] = useState(false);
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
    document.body.classList.toggle("overflowHidden", !isMobileMenuOpen);
  };
  const closeMobileMenu = () => {
    setTimeout(() => {
      setMobileMenuOpen(false);
      document.body.classList.remove("overflowHidden");
    }, 300); // Delay of 300ms for synchronization
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

        <div className={styles.searchBar}>
          <form onSubmit={handleSearch}>
            <span><HiOutlineSearch /></span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search articles..."
              className={styles.searchInput}
            />
            <button 
              type="submit" 
              className={styles.searchButton}
              disabled={!searchTerm}
            >
              <IoArrowForwardOutline />
            </button>
          </form>
        </div>
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
          <div className={styles.SocialLinks}>
              <Link href="https://x.com/bonjour_idol">
                  <FaXTwitter />
              </Link>
              <Link href="https://www.instagram.com/bonjour_idol/">
                  <FaInstagram />
              </Link>
              <Link href="https://www.youtube.com/@bonjouridol">
                  <FaYoutube />
              </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}