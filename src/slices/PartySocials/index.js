"use client";

/**
 * Bonjour Party footer socials. Page-only slice rendered inside /party's footer.
 * Consecutive links sharing the same `org` are grouped together, in order.
 * @typedef {import("@prismicio/client").Content.PartySocialsSlice} PartySocialsSlice
 * @param {{ slice: PartySocialsSlice, t?: Record<string,string> }}
 */
import { PrismicNextLink } from "@prismicio/next";
import styles from "./page.module.scss";

const PartySocials = ({ slice, t = {} }) => {
  const links = slice?.primary?.links || [];
  if (!links.length) return null;

  const orgs = [];
  const map = {};
  links.forEach((l) => {
    const key = l.org || "";
    if (!map[key]) {
      map[key] = { org: key, links: [] };
      orgs.push(map[key]);
    }
    map[key].links.push(l);
  });

  return (
    <div
      className={styles.socials}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      <div className={styles.orgs}>
        {orgs.map((o, i) => (
          <div key={i}>
            {o.org && <div className={styles.orgName}>{o.org}</div>}
            <div className={styles.links}>
              {o.links.map((l, j) =>
                l.url?.url ? (
                  <PrismicNextLink key={j} field={l.url} className={styles.pill}>
                    {l.label}
                  </PrismicNextLink>
                ) : (
                  <span key={j} className={styles.pill}>
                    {l.label}
                  </span>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartySocials;
