'use client'

import { useState, useEffect, useRef } from 'react'
import { FiSearch, FiChevronDown, FiX, FiCheck } from 'react-icons/fi'
import styles from './SearchableSelect.module.scss'

export default function SearchableSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Search and select...',
  required = false,
  className = '',
  disabled = false,
  loading = false,
  onSearch,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(options)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Filter options based on search term (client-side filtering)
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = options.filter(option => {
        const label = typeof option === 'string' ? option : option.label
        return label.toLowerCase().includes(searchTerm.toLowerCase())
      })
      setFilteredOptions(filtered)
    } else {
      setFilteredOptions(options)
    }
  }, [searchTerm, options])

  // Call onSearch callback when search term changes (for async search)
  // Only call when dropdown is open and user is actively typing
  const prevSearchTermRef = useRef('')
  const hasUserTypedRef = useRef(false)
  
  useEffect(() => {
    // Reset tracking when dropdown closes
    if (!isOpen) {
      prevSearchTermRef.current = ''
      hasUserTypedRef.current = false
      return
    }
    
    // Only call onSearch if:
    // 1. Dropdown is open (user is actively interacting)
    // 2. onSearch callback is provided
    // 3. User has actually typed something (not just opened dropdown)
    // 4. Search term actually changed
    if (isOpen && onSearch && hasUserTypedRef.current && searchTerm !== prevSearchTermRef.current) {
      prevSearchTermRef.current = searchTerm
      onSearch(searchTerm)
    }
  }, [searchTerm, isOpen]) // Only depend on searchTerm and isOpen, not onSearch
  
  // Track when user actually types in the search input
  function handleSearchInputChange(e) {
    hasUserTypedRef.current = true
    setSearchTerm(e.target.value)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const selectedOption = options.find(opt => {
    const optValue = typeof opt === 'string' ? opt : opt.value
    return optValue === value
  })
  const displayValue = selectedOption 
    ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label)
    : ''

  function handleSelect(option) {
    const optionValue = typeof option === 'string' ? option : option.value
    const optionLabel = typeof option === 'string' ? option : option.label
    
    // Create a synthetic event
    const syntheticEvent = {
      target: {
        value: optionValue,
        name: id,
      }
    }
    
    onChange(syntheticEvent)
    setIsOpen(false)
    setSearchTerm('')
  }

  function handleClear(e) {
    e.stopPropagation()
    const syntheticEvent = {
      target: {
        value: '',
        name: id,
      }
    }
    onChange(syntheticEvent)
    setSearchTerm('')
  }

  return (
    <div 
      ref={containerRef}
      className={`${styles.searchableSelect} ${className} ${disabled ? styles.disabled : ''} ${isOpen ? styles.open : ''}`}
    >
      <div 
        className={styles.selectTrigger}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {displayValue ? (
          <span className={styles.selectedValue}>{displayValue}</span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <div className={styles.triggerIcons}>
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
              aria-label="Clear selection"
            >
              <FiX />
            </button>
          )}
          <FiChevronDown className={styles.chevron} />
        </div>
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchInputWrapper}>
            <FiSearch className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearchInputChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className={styles.optionsList}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : filteredOptions.length === 0 ? (
              <div className={styles.noResults}>No results found</div>
            ) : (
              filteredOptions.map((option) => {
                const optionValue = typeof option === 'string' ? option : option.value
                const optionLabel = typeof option === 'string' ? option : option.label
                const isSelected = optionValue === value

                return (
                  <div
                    key={optionValue}
                    className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    {optionLabel}
                    {isSelected && <FiCheck className={styles.checkIcon} />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

