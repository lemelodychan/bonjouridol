"use strict";
exports.id = 0;
exports.ids = [0];
exports.modules = {

/***/ 3000:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  w: () => (/* binding */ PrismicLink)
});

// UNUSED EXPORTS: defaultComponent

// EXTERNAL MODULE: external "next/dist/compiled/react/jsx-runtime"
var jsx_runtime_ = __webpack_require__(6786);
// EXTERNAL MODULE: ./node_modules/next/dist/compiled/react/react.shared-subset.js
var react_shared_subset = __webpack_require__(2947);
;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/lib/isInternalURL.js
const isInternalURL = (url)=>{
    const isInternal = /^(\/(?!\/)|#)/.test(url);
    const isSpecialLink = !isInternal && !/^https?:\/\//.test(url);
    return isInternal && !isSpecialLink;
};
 //# sourceMappingURL=isInternalURL.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/types/value/link.js
const LinkType = {
    Any: "Any",
    Document: "Document",
    Media: "Media",
    Web: "Web"
};
 //# sourceMappingURL=link.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/helpers/documentToLinkField.js

const documentToLinkField = (prismicDocument)=>{
    var _a;
    return {
        link_type: LinkType.Document,
        id: prismicDocument.id,
        uid: prismicDocument.uid || void 0,
        type: prismicDocument.type,
        tags: prismicDocument.tags,
        lang: prismicDocument.lang,
        url: prismicDocument.url == null ? void 0 : prismicDocument.url,
        slug: (_a = prismicDocument.slugs) == null ? void 0 : _a[0],
        // The REST API does not include a `data` property if the data
        // object is empty.
        //
        // A presence check for `prismicDocument.data` is done to
        // support partial documents. While `documentToLinkField` is
        // not typed to accept partial documents, passing a partial
        // document can happen in untyped projects.
        ...prismicDocument.data && Object.keys(prismicDocument.data).length > 0 ? {
            data: prismicDocument.data
        } : {}
    };
};
 //# sourceMappingURL=documentToLinkField.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/helpers/asLink.js


const asLink = (linkFieldOrDocument, ...configObjectOrTuple)=>{
    if (!linkFieldOrDocument) {
        return null;
    }
    const linkField = // prettier-ignore
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Bug in TypeScript 4.9: https://github.com/microsoft/TypeScript/issues/51501
    // TODO: Remove the `prettier-ignore` comment when this bug is fixed.
    "link_type" in linkFieldOrDocument ? linkFieldOrDocument : documentToLinkField(linkFieldOrDocument);
    const [configObjectOrLinkResolver] = configObjectOrTuple;
    let config;
    if (typeof configObjectOrLinkResolver === "function" || configObjectOrLinkResolver == null) {
        config = {
            linkResolver: configObjectOrLinkResolver
        };
    } else {
        config = {
            ...configObjectOrLinkResolver
        };
    }
    switch(linkField.link_type){
        case LinkType.Media:
        case LinkType.Web:
            return "url" in linkField ? linkField.url : null;
        case LinkType.Document:
            {
                if ("id" in linkField && config.linkResolver) {
                    const resolvedURL = config.linkResolver(linkField);
                    if (resolvedURL != null) {
                        return resolvedURL;
                    }
                }
                if ("url" in linkField && linkField.url) {
                    return linkField.url;
                }
                return null;
            }
        case LinkType.Any:
        default:
            return null;
    }
};
 //# sourceMappingURL=asLink.js.map

// EXTERNAL MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/helpers/isFilled.js
var isFilled = __webpack_require__(5405);
;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/helpers/asLinkAttrs.js



const asLinkAttrs = (linkFieldOrDocument, config = {})=>{
    if (linkFieldOrDocument && // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Bug in TypeScript 4.9: https://github.com/microsoft/TypeScript/issues/51501
    ("link_type" in linkFieldOrDocument ? (0,isFilled/* link */.p4)(linkFieldOrDocument) : linkFieldOrDocument)) {
        const target = // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Bug in TypeScript 4.9: https://github.com/microsoft/TypeScript/issues/51501
        "target" in linkFieldOrDocument ? linkFieldOrDocument.target : void 0;
        const rawHref = asLink(linkFieldOrDocument, config.linkResolver);
        const href = rawHref == null ? void 0 : rawHref;
        const isExternal = typeof href === "string" ? !isInternalURL(href) : false;
        const rel = config.rel ? config.rel({
            href,
            isExternal,
            target
        }) : isExternal ? "noreferrer" : void 0;
        return {
            href,
            target,
            rel: rel == null ? void 0 : rel
        };
    }
    return {};
};
 //# sourceMappingURL=asLinkAttrs.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/lib/isInternalURL.js
const isInternalURL_isInternalURL = (url)=>{
    const isInternal = /^(\/(?!\/)|#)/.test(url);
    const isSpecialLink = !isInternal && !/^https?:\/\//.test(url);
    return isInternal && !isSpecialLink;
};
 //# sourceMappingURL=isInternalURL.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/react-server/PrismicLink.js






const defaultComponent = "a";
const PrismicLink = /*#__PURE__*/ react_shared_subset.forwardRef(function PrismicLink2({ field, document: doc, linkResolver, internalComponent, externalComponent, ...restProps }, ref) {
    if (typeof process !== "undefined" && "production" === "development") {}
    const { href: computedHref, rel: computedRel, ...attrs } = asLinkAttrs(field ?? doc, {
        linkResolver,
        rel: typeof restProps.rel === "function" ? restProps.rel : void 0
    });
    let rel = computedRel;
    if ("rel" in restProps && typeof restProps.rel !== "function") {
        rel = restProps.rel;
    }
    const href = ("href" in restProps ? restProps.href : computedHref) || "";
    const InternalComponent = internalComponent || defaultComponent;
    const ExternalComponent = externalComponent || defaultComponent;
    const Component = href && isInternalURL_isInternalURL(href) ? InternalComponent : ExternalComponent;
    return /* @__PURE__ */ (0,jsx_runtime_.jsx)(Component, {
        ref,
        ...attrs,
        ...restProps,
        href,
        rel
    });
});
 //# sourceMappingURL=PrismicLink.js.map


/***/ })

};
;