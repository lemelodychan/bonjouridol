/**
 * @typedef {import("@prismicio/client").Content.InterviewSlice} InterviewSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<InterviewSlice>} InterviewProps
 * @param {InterviewProps}
 */
import { PrismicRichText } from "@prismicio/react";

import styles from "./page.module.scss";

const Interview = ({ slice }) => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className={styles.Interview}
    >
        {slice.primary.question.map((item, index) => (
          <div key={index} className={styles.questionContainer}>
            <div className={styles.question}>
              <span className={styles.questionEn}>{item.question_en}</span>
              {item.question_jp && (
                <span className={styles.questionJp}>{item.question_jp}</span>
              )}
            </div>

            <div className={styles.answer}>
              <div className={styles.answerEn}>
                <PrismicRichText field={item.answer_en} />
              </div>
              {item.answer_jp && (
                <div className={styles.answerJp}>
                  <PrismicRichText field={item.answer_jp} />
                </div>
              )}
            </div>
          </div>
        ))}
    </section>
  );
};

export default Interview;
