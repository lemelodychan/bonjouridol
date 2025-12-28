"use client";

import { useState, useEffect, startTransition } from "react";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

import LogoDesktop from "../assets/logo_croissant_pink.svg";
import LogoMobileWhite from "../assets/logo_croissant_white.svg";
import LogoMobilePink from "../assets/logo_croissant_pink.svg";
import LogoMobileMenu from "../assets/logo_normal_white.svg";

import { FaXTwitter, FaInstagram, FaYoutube, FaTiktok } from "react-icons/fa6";
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
      const searchQuery = searchTerm.trim();
      
      // Track search query with Umami
      if (typeof window !== 'undefined' && window.umami && !window.umami.disabled && localStorage.getItem('umami.disabled') !== '1') {
        try {
          window.umami.track('search_query', {
            search_term: searchQuery
          });
          console.log('Umami search event tracked:', searchQuery);
        } catch (error) {
          console.error('Error tracking search with Umami:', error);
        }
      } else {
        console.log('Umami not available for search tracking');
      }
      
      // Close mobile overlay if open
      if (isSearchOpen) {
        closeSearch();
      }
      
      // Clear search input
      setSearchTerm("");
      
      // Navigate to search results page
      // Use startTransition to ensure loading state is properly triggered
      const searchUrl = `/search?keyword=${encodeURIComponent(searchQuery)}`;
      
      startTransition(() => {
        // Navigate to search page - Next.js loading.tsx will show skeleton automatically
        router.push(searchUrl);
      });
    }
  };

  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isScrolled, setScrolled] = useState(false);
  const toggleMobileMenu = () => {
    if (isSearchOpen) {
      closeSearch();
      setTimeout(() => {
        setMobileMenuOpen(true);
        document.body.classList.add("overflowHidden");
      }, 300);
    } else {
      setMobileMenuOpen(!isMobileMenuOpen);
      document.body.classList.toggle("overflowHidden", !isMobileMenuOpen);
    }
  };
  const closeMobileMenu = () => {
    setTimeout(() => {
      setMobileMenuOpen(false);
      document.body.classList.remove("overflowHidden");
    }, 300); // Delay of 300ms for synchronization
  };
  const toggleSearch = () => {
    if (isMobileMenuOpen) {
      closeMobileMenu();
      setTimeout(() => {
        setSearchOpen(true);
        document.body.classList.add("overflowHidden");
      }, 300);
    } else {
      setSearchOpen(!isSearchOpen);
      document.body.classList.toggle("overflowHidden", !isSearchOpen);
    }
  };
  const closeSearch = () => {
    setTimeout(() => {
      setSearchOpen(false);
      document.body.classList.remove("overflowHidden");
    }, 50); // Small delay for smooth animation
  };


  useEffect(() => {
    if (isArticleOrHomePage) {
      const handleScroll = () => setScrolled(window.scrollY > 640);
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [isArticleOrHomePage]);

  // Debug Umami availability
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Umami available:', !!window.umami);
      if (window.umami) {
        console.log('Umami object:', window.umami);
      }
    }
  }, []);

  // Handle click outside to close search overlay (backup for clicks outside backdrop)
  useEffect(() => {
    if (!isSearchOpen) return;

    const handleClickOutside = (event) => {
      const overlay = event.target.closest(`.${styles.mobileSearchOverlay}`);
      const backdrop = event.target.closest(`.${styles.searchOverlayBackdrop}`);
      const searchButton = event.target.closest(`.${styles.mobileSearchButton}`);
      
      // If click is outside overlay/backdrop and not on search button, close overlay
      if (!overlay && !backdrop && !searchButton) {
        closeSearch();
      }
    };

    // Add event listener after a small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSearchOpen]);

  return (
    <div className={styles.navigation}>
      {/* Fixed Mobile Search Icon */}
      <button
        onClick={toggleSearch}
        className={`${styles.mobileSearchButton} ${
            isScrolled || !isArticleOrHomePage
              ? styles.whiteBackground
              : ""
          } ${isMobileMenuOpen || isSearchOpen ? styles.hidden : ""}`}
        >
            <HiOutlineSearch
              className={`${styles.mobileIcon} ${
                  isScrolled || !isArticleOrHomePage ? styles.pinkIcon : styles.whiteIcon
              }`}
            />
        </button>

      {/* Fixed Mobile Menu Icon */}
      <button
        onClick={toggleMobileMenu}
        className={`${styles.mobileMenuButton} ${
            isMobileMenuOpen
              ? ""
              : isScrolled || !isArticleOrHomePage
              ? styles.whiteBackground
              : ""
          } ${isSearchOpen ? styles.hidden : ""}`}
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
              <Link href="https://www.tiktok.com/@bonjour_idol">
                  <FaTiktok />
              </Link>
              <Link href="https://www.youtube.com/@bonjouridol">
                  <FaYoutube />
              </Link>
          </div>
        </nav>
      </div>

      {/* Mobile Search Overlay Backdrop */}
      {isSearchOpen && (
        <div 
          className={styles.searchOverlayBackdrop}
          onClick={closeSearch}
        />
      )}

      {/* Mobile Search Overlay */}
      <div
        className={`${styles.mobileSearchOverlay} ${isSearchOpen ? styles.open : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.searchOverlayContent}>
          <form onSubmit={handleSearch} className={styles.searchOverlayForm}>
            <div className={styles.searchOverlayInputWrapper}>
              <HiOutlineSearch className={styles.searchOverlayIcon} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search articles..."
                className={styles.searchOverlayInput}
                autoFocus
              />
              <button 
                type="submit" 
                className={styles.searchOverlayButton}
                disabled={!searchTerm.trim()}
              >
                <IoArrowForwardOutline />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}