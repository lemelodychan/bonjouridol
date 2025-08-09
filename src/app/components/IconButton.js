import classNames from 'classnames';
import Link from 'next/link';
import '../globals.css';
import styles from './IconButton.module.scss';

function Button(props) {
  const {
    href,
    className,
    variant,
    textValue,
    icon,
    onClick,
    ...rest
  } = props;

  const classes = classNames(styles.Main, variant && styles[variant], className);

  if (href) {
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