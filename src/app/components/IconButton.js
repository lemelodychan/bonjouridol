import classNames from 'classnames';
import Link from 'next/link';
import '../globals.css';
import styles from './IconButton.module.scss';

function Button(props) {
  const {
    href,
    className,
    variant,
    size,
    textValue,
    icon,
    onClick,
    ...rest
  } = props;

  const classes = classNames(
    styles.Main, 
    variant && styles[variant],
    size && styles[size],
    className
  );

  if (href) {
    // Check if it's an external link
    const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//');
    
    if (isExternal) {
      return (
        <a href={href} className={classes} {...rest}>
          <span>{textValue}</span>
          {icon}
        </a>
      );
    }
    
    return (
      <Link href={href} className={classes} {...rest}>
        <span>{textValue}</span>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} {...rest}>
      <span>{textValue}</span>
      {icon}
    </button>
  );
}

export default Button;