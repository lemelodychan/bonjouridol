import Link from "next/link";
import styles from "./404.module.scss";

export default function Custom404() {
  return (
    <div className={styles.container}>
      <h1>404 - Page Not Found</h1>
      <p>
        Oops! The page you're looking for doesn't exist.
      </p>
      <Link href="/" className={styles.btn}>
        <span>Back to homepage</span>
        <span>→</span>
      </Link>
    </div>
  );
}
