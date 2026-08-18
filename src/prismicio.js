import * as prismic from "@prismicio/client";
import * as prismicNext from "@prismicio/next";
import config from "../slicemachine.config.json";
const fetch = require('node-fetch');

export const endpoint = "https://bonjouridol.cdn.prismic.io/api/v2";
// Fall back to the repository name in slicemachine.config.json when REPO_NAME
// is not set in the environment. Without this, a dev server started without the
// env var builds requests against https://undefined.cdn.prismic.io.
export const repositoryName = process.env.REPO_NAME || config.repositoryName;

/**
 * A list of Route Resolver objects that define how a document's `url` field is resolved.
 *
 * {@link https://prismic.io/docs/route-resolver#route-resolver}
 *
 * @type {prismic.ClientConfig["routes"]}
 */

export const routes = [
  { type: "homepage", path: "/" },
  { type: "bonjour_party", path: "/party" },
  { type: "page", path: "/:uid" },
  { type: "articles", path: "/articles/:uid" },
  { type: "gallery", path: "/galleries/:uid" },
];

export const linkResolver = (doc) => {
  switch (doc.type) {
    case "homepage":
      return "/";
    case "bonjour_party":
      return "/party";
    case "page":
      return `/${doc.uid}`;
    case "articles":
      return `/articles/${doc.uid}`;
    case "gallery":
      return `/galleries/${doc.uid}`;
    default:
      return "/";
  }
};


/**
 * Creates a Prismic client for the project's repository. The client is used to
 * query content from the Prismic API.
 *
 * @param {prismicNext.CreateClientConfig} config - Configuration for the Prismic client.
 */
// export const createClient = (config = {}) => {
//   const client = prismic.createClient(repositoryName, {
//     routes,
//     fetchOptions:
//       process.env.NODE_ENV === "production"
//         ? { next: { tags: ["prismic"] }, cache: "force-cache" }
//         : { next: { revalidate: 5 } },
//     ...config,
//   });

//   prismicNext.enableAutoPreviews({
//     client,
//     previewData: config.previewData,
//     req: config.req,
//   });

//   return client;
// };

export const createClient = (config = {}) => {
  const client = prismic.createClient(repositoryName, {
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
    fetchOptions: {
      // Remove conflicting cache settings - let individual components handle their own caching
      next: process.env.NODE_ENV === "production"
        ? { tags: ["prismic"] }
        : {}, // No global cache settings in development
    },
    ...config,
  });

  prismicNext.enableAutoPreviews({
    client,
    previewData: config.previewData,
    req: config.req,
  });

  return client;
};