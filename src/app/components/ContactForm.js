"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "./IconButton";

import { IoChevronDownOutline, IoArrowForwardOutline } from "react-icons/io5";
import styles from "./ContactForm.module.scss";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    subject: "",
    message: "",
    purpose: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const { name, company, email, subject, message, purpose } = formData;

    // Email details
    const mailto = `mailto:melody@bonjouridol.com?cc=&bcc=melody@bonjouridol.com,melody@bonjouridol.com&subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(
      `Name: ${name}
Company: ${company}
Email: ${email}
Purpose of Inquiry: ${purpose}
----
${message}`
    )}`;

    const newTab = window.open(mailto, "_blank");
    if (!newTab || newTab.closed || typeof newTab.closed === "undefined") {
        window.location.href = mailto;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.ContactForm}>
      {/* Name Field */}
      <div className={styles.Name}>
        <label htmlFor="name">Name / お名前 <strong>※</strong></label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Your name"
        />
      </div>

      <div className={styles.Company}>
        <label htmlFor="name">Company / 会社名</label>
        <input
          type="text"
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          placeholder="Your company"
        />
      </div>

      {/* Email Field */}
      <div className={styles.Email}>
        <label htmlFor="email">Email / メールアドレス <strong>※</strong></label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="Your email address"
        />
      </div>

      {/* Purpose Select */}
      <div className={styles.Purpose}>
        <label htmlFor="purpose">Purpose of Inquiry / お問い合わせの目的 <strong>※</strong></label>
        <select
          id="purpose"
          name="purpose"
          value={formData.purpose}
          onChange={handleChange}
          required
        >
          <option value="">Select a purpose / 目的を選択</option>
          <option value="Event Coverage Request">Event Coverage Request / 取材依頼</option>
          <option value="Photoshoot Request">Photoshoot Request / 撮影依頼</option>
          <option value="Other">Other / その他</option>
        </select>
        <IoChevronDownOutline />
      </div>

      {/* Subject Field */}
      <div className={styles.Subject}>
        <label htmlFor="subject">Subject / 件名 <strong>※</strong></label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          required
          placeholder="Subject of your inquiry"
        />
      </div>

      {/* Message Field */}
      <div className={styles.Message}>
        <label htmlFor="message">Message / メッセージ <strong>※</strong></label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          placeholder="Your message"
        />
      </div>

      <div className={styles.Button}>
        <Button type="submit" variant={"Pink"} textValue={"Send inquiry"} icon={<IoArrowForwardOutline />} />
      </div>
    </form>
  );
}
