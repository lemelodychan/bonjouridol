import Link from "next/link";
import Button from "./components/IconButton";

import { IoArrowForwardOutline } from "react-icons/io5";

import styles from "./404.module.scss";

export default function Custom404() {
  return (
    <div className={styles.container}>
      <h1>404 - Page Not Found</h1>
      <p>
        Oops! The page you're looking for doesn't exist.
      </p>
      <Link href="/" className={styles.btn}>
        <Button variant={"Pink"} textValue={"Back to homepage"} icon={<IoArrowForwardOutline />} />
    </Link>
    </div>
  );
}
