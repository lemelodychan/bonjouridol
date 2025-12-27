'use client'

import { IoChevronDownOutline } from 'react-icons/io5'
import styles from './CustomSelect.module.scss'

export default function CustomSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  required = false,
  className = '',
  disabled = false,
  ...props
}) {
  return (
    <div className={`${styles.customSelect} ${className} ${disabled ? styles.disabled : ''}`}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        className={styles.select}
        disabled={disabled}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value
          const optionLabel = typeof option === 'string' ? option : option.label
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          )
        })}
      </select>
      <IoChevronDownOutline className={styles.chevron} />
    </div>
  )
}

