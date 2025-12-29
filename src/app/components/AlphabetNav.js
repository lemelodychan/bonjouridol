'use client';

import { useEffect, useState, useMemo } from 'react';
import styles from './AlphabetNav.module.scss';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function AlphabetNav({ availableLetters = [], hasSpecialChars = false }) {
  const [activeLetter, setActiveLetter] = useState(null);

  // Create a stable string key from availableLetters to use as dependency
  const availableLettersKey = useMemo(() => {
    return JSON.stringify([...availableLetters].sort()) + (hasSpecialChars ? '#true' : '#false');
  }, [availableLetters, hasSpecialChars]);

  const scrollToLetter = (letter) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      const offset = 100; // Offset for fixed headers if any
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // Find which letter section is currently in view
      const scrollPosition = window.scrollY;
      const detectionOffset = 200; // Offset from top of viewport for detection
      const detectionPoint = scrollPosition + detectionOffset;

      // Collect all sections with their positions
      const sections = [];

      // Add regular letters
      availableLetters.forEach((letter) => {
        const element = document.getElementById(`letter-${letter}`);
        if (element) {
          sections.push({
            letter,
            top: element.offsetTop
          });
        }
      });

      // Add special chars section if it exists (add it last so it's checked after all letters)
      if (hasSpecialChars) {
        const specialElement = document.getElementById('letter-#');
        if (specialElement) {
          sections.push({
            letter: '#',
            top: specialElement.offsetTop
          });
        }
      }

      // Sort sections by their top position (ascending)
      sections.sort((a, b) => a.top - b.top);

      if (sections.length === 0) return;

      // Find the section whose top is closest to but not past our detection point
      // We iterate from the end (bottom) to find the last section we've scrolled past
      let activeSection = sections[0]; // Default to first section

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        // If we've scrolled past this section's top
        if (detectionPoint >= section.top) {
          activeSection = section;
          break;
        }
      }

      setActiveLetter(activeSection.letter);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [availableLettersKey, hasSpecialChars]);

  return (
    <nav className={styles.alphabetNav}>
      <div className={styles.lettersContainer}>
        {ALPHABET.map((letter) => {
          const isAvailable = availableLetters.includes(letter);
          const isActive = activeLetter === letter;

          return (
            <button
              key={letter}
              className={`${styles.letterLink} ${isAvailable ? styles.available : styles.unavailable} ${isActive ? styles.active : ''}`}
              onClick={() => isAvailable && scrollToLetter(letter)}
              disabled={!isAvailable}
              aria-label={`Jump to artists starting with ${letter}`}
            >
              {letter}
            </button>
          );
        })}
        {/* Special characters anchor */}
        {hasSpecialChars && (
          <button
            className={`${styles.letterLink} ${styles.available} ${activeLetter === '#' ? styles.active : ''}`}
            onClick={() => scrollToLetter('#')}
            aria-label="Jump to artists starting with numbers or special characters"
          >
            #
          </button>
        )}
      </div>
    </nav>
  );
}

