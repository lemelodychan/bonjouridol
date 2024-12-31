/**
 * @typedef {import("@prismicio/client").Content.ContactFormSlice} ContactFormSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<ContactFormSlice>} ContactFormProps
 * @param {ContactFormProps}
 */
import ContactForm from "@/app/components/ContactForm";
import styles from "./page.module.scss";

const ContactFormSlice = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.ContactFormContainer}
    >
      <ContactForm />
    </section>
  );
};

export default ContactFormSlice;
