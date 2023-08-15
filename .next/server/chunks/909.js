"use strict";
exports.id = 909;
exports.ids = [909];
exports.modules = {

/***/ 2909:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  v: () => (/* binding */ PrismicRichText)
});

// EXTERNAL MODULE: external "next/dist/compiled/react/jsx-runtime"
var jsx_runtime_ = __webpack_require__(6786);
// EXTERNAL MODULE: ./node_modules/next/dist/compiled/react/react.shared-subset.js
var react_shared_subset = __webpack_require__(2947);
;// CONCATENATED MODULE: ./node_modules/@prismicio/types/dist/value/richText.js
const RichTextNodeType = {
    heading1: "heading1",
    heading2: "heading2",
    heading3: "heading3",
    heading4: "heading4",
    heading5: "heading5",
    heading6: "heading6",
    paragraph: "paragraph",
    preformatted: "preformatted",
    strong: "strong",
    em: "em",
    listItem: "list-item",
    oListItem: "o-list-item",
    list: "group-list-item",
    oList: "group-o-list-item",
    image: "image",
    embed: "embed",
    hyperlink: "hyperlink",
    label: "label",
    span: "span"
};
 //# sourceMappingURL=richText.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/richtext/dist/types.js

const RichTextReversedNodeType = {
    [RichTextNodeType.listItem]: "listItem",
    [RichTextNodeType.oListItem]: "oListItem",
    [RichTextNodeType.list]: "list",
    [RichTextNodeType.oList]: "oList"
};
 //# sourceMappingURL=types.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/richtext/dist/wrapMapSerializer.js

const wrapMapSerializer = (mapSerializer)=>{
    return (type, node, text, children, key)=>{
        const tagSerializer = mapSerializer[RichTextReversedNodeType[type] || type];
        if (tagSerializer) {
            return tagSerializer({
                // @ts-expect-error cannot type check here
                type,
                // @ts-expect-error cannot type check here
                node,
                // @ts-expect-error cannot type check here
                text,
                // @ts-expect-error cannot type check here
                children,
                // @ts-expect-error cannot type check here
                key
            });
        }
    };
};
 //# sourceMappingURL=wrapMapSerializer.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/richtext/dist/composeSerializers.js
const composeSerializers = (...serializers)=>{
    return (...args)=>{
        for(let i = 0; i < serializers.length; i++){
            const serializer = serializers[i];
            if (serializer) {
                const res = serializer(...args);
                if (res != null) {
                    return res;
                }
            }
        }
    };
};
 //# sourceMappingURL=composeSerializers.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/richtext/dist/asTree.js

const uuid = ()=>{
    return (++uuid.i).toString();
};
uuid.i = 0;
const asTree = (nodes)=>{
    const preparedNodes = prepareNodes(nodes);
    const children = [];
    for(let i = 0; i < preparedNodes.length; i++){
        children.push(nodeToTreeNode(preparedNodes[i]));
    }
    return {
        key: uuid(),
        children
    };
};
const createTreeNode = (node, children = [])=>{
    return {
        key: uuid(),
        type: node.type,
        text: "text" in node ? node.text : void 0,
        node,
        children
    };
};
const createTextTreeNode = (text)=>{
    return createTreeNode({
        type: RichTextNodeType.span,
        text,
        spans: []
    });
};
const prepareNodes = (nodes)=>{
    const mutNodes = nodes.slice(0);
    for(let i = 0; i < mutNodes.length; i++){
        const node = mutNodes[i];
        if (node.type === RichTextNodeType.listItem || node.type === RichTextNodeType.oListItem) {
            const items = [
                node
            ];
            while(mutNodes[i + 1] && mutNodes[i + 1].type === node.type){
                items.push(mutNodes[i + 1]);
                mutNodes.splice(i, 1);
            }
            if (node.type === RichTextNodeType.listItem) {
                mutNodes[i] = {
                    type: RichTextNodeType.list,
                    items
                };
            } else {
                mutNodes[i] = {
                    type: RichTextNodeType.oList,
                    items
                };
            }
        }
    }
    return mutNodes;
};
const nodeToTreeNode = (node)=>{
    if ("text" in node) {
        return createTreeNode(node, textNodeSpansToTreeNodeChildren(node.spans, node));
    }
    if ("items" in node) {
        const children = [];
        for(let i = 0; i < node.items.length; i++){
            children.push(nodeToTreeNode(node.items[i]));
        }
        return createTreeNode(node, children);
    }
    return createTreeNode(node);
};
const textNodeSpansToTreeNodeChildren = (spans, node, parentSpan)=>{
    if (!spans.length) {
        return [
            createTextTreeNode(node.text)
        ];
    }
    const mutSpans = spans.slice(0);
    mutSpans.sort((a, b)=>a.start - b.start || b.end - a.end);
    const children = [];
    for(let i = 0; i < mutSpans.length; i++){
        const span = mutSpans[i];
        const parentSpanStart = parentSpan && parentSpan.start || 0;
        const spanStart = span.start - parentSpanStart;
        const spanEnd = span.end - parentSpanStart;
        const text = node.text.slice(spanStart, spanEnd);
        const childSpans = [];
        for(let j = i; j < mutSpans.length; j++){
            const siblingSpan = mutSpans[j];
            if (siblingSpan !== span) {
                if (siblingSpan.start >= span.start && siblingSpan.end <= span.end) {
                    childSpans.push(siblingSpan);
                    mutSpans.splice(j, 1);
                    j--;
                } else if (siblingSpan.start < span.end && siblingSpan.end > span.start) {
                    childSpans.push({
                        ...siblingSpan,
                        end: span.end
                    });
                    mutSpans[j] = {
                        ...siblingSpan,
                        start: span.end
                    };
                }
            }
        }
        if (i === 0 && spanStart > 0) {
            children.push(createTextTreeNode(node.text.slice(0, spanStart)));
        }
        const spanWithText = {
            ...span,
            text
        };
        children.push(createTreeNode(spanWithText, textNodeSpansToTreeNodeChildren(childSpans, {
            ...node,
            text
        }, span)));
        if (spanEnd < node.text.length) {
            children.push(createTextTreeNode(node.text.slice(spanEnd, mutSpans[i + 1] ? mutSpans[i + 1].start - parentSpanStart : void 0)));
        }
    }
    return children;
};
 //# sourceMappingURL=asTree.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/richtext/dist/serialize.js

const serialize = (richTextField, serializer)=>{
    return serializeTreeNodes(asTree(richTextField).children, serializer);
};
const serializeTreeNodes = (nodes, serializer)=>{
    const serializedTreeNodes = [];
    for(let i = 0; i < nodes.length; i++){
        const treeNode = nodes[i];
        const serializedTreeNode = serializer(treeNode.type, treeNode.node, treeNode.text, serializeTreeNodes(treeNode.children, serializer), treeNode.key);
        if (serializedTreeNode != null) {
            serializedTreeNodes.push(serializedTreeNode);
        }
    }
    return serializedTreeNodes;
};
 //# sourceMappingURL=serialize.js.map

// EXTERNAL MODULE: ./node_modules/@prismicio/react/dist/react-server/PrismicLink.js + 6 modules
var PrismicLink = __webpack_require__(3000);
// EXTERNAL MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/helpers/isFilled.js
var isFilled = __webpack_require__(5405);
;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/react-server/PrismicRichText.js






const createDefaultSerializer = (args)=>wrapMapSerializer({
        heading1: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("h1", {
                children
            }, key),
        heading2: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("h2", {
                children
            }, key),
        heading3: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("h3", {
                children
            }, key),
        heading4: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("h4", {
                children
            }, key),
        heading5: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("h5", {
                children
            }, key),
        heading6: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("h6", {
                children
            }, key),
        paragraph: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("p", {
                children
            }, key),
        preformatted: ({ node, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("pre", {
                children: node.text
            }, key),
        strong: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("strong", {
                children
            }, key),
        em: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("em", {
                children
            }, key),
        listItem: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("li", {
                children
            }, key),
        oListItem: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("li", {
                children
            }, key),
        list: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("ul", {
                children
            }, key),
        oList: ({ children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("ol", {
                children
            }, key),
        image: ({ node, key })=>{
            const img = /* @__PURE__ */ (0,jsx_runtime_.jsx)("img", {
                src: node.url,
                alt: node.alt ?? void 0,
                "data-copyright": node.copyright ? node.copyright : void 0
            });
            return /* @__PURE__ */ (0,jsx_runtime_.jsx)("p", {
                className: "block-img",
                children: node.linkTo ? /* @__PURE__ */ (0,jsx_runtime_.jsx)(PrismicLink/* PrismicLink */.w, {
                    linkResolver: args.linkResolver,
                    internalComponent: args.internalLinkComponent,
                    externalComponent: args.externalLinkComponent,
                    field: node.linkTo,
                    children: img
                }) : img
            }, key);
        },
        embed: ({ node, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("div", {
                "data-oembed": node.oembed.embed_url,
                "data-oembed-type": node.oembed.type,
                "data-oembed-provider": node.oembed.provider_name,
                dangerouslySetInnerHTML: {
                    __html: node.oembed.html ?? ""
                }
            }, key),
        hyperlink: ({ node, children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)(PrismicLink/* PrismicLink */.w, {
                field: node.data,
                linkResolver: args.linkResolver,
                internalComponent: args.internalLinkComponent,
                externalComponent: args.externalLinkComponent,
                children
            }, key),
        label: ({ node, children, key })=>/* @__PURE__ */ (0,jsx_runtime_.jsx)("span", {
                className: node.data.label,
                children
            }, key),
        span: ({ text, key })=>{
            const result = [];
            let i = 0;
            for (const line of text.split("\n")){
                if (i > 0) {
                    result.push(/* @__PURE__ */ (0,jsx_runtime_.jsx)("br", {}, `${i}__break`));
                }
                result.push(/* @__PURE__ */ (0,jsx_runtime_.jsx)(react_shared_subset.Fragment, {
                    children: line
                }, `${i}__line`));
                i++;
            }
            return /* @__PURE__ */ (0,jsx_runtime_.jsx)(react_shared_subset.Fragment, {
                children: result
            }, key);
        }
    });
function PrismicRichText({ linkResolver, field, fallback, components, externalLinkComponent, internalLinkComponent, ...restProps }) {
    return react_shared_subset.useMemo(()=>{
        if (typeof process !== "undefined" && "production" === "development") {}
        if ((0,isFilled/* richText */.qO)(field)) {
            const serializer = composeSerializers(typeof components === "object" ? wrapMapSerializer(components) : components, createDefaultSerializer({
                linkResolver,
                internalLinkComponent,
                externalLinkComponent
            }));
            const serialized = serialize(field, (type, node, text, children, key)=>{
                const result = serializer(type, node, text, children, key);
                if (/*#__PURE__*/ react_shared_subset.isValidElement(result) && result.key == null) {
                    return /*#__PURE__*/ react_shared_subset.cloneElement(result, {
                        key
                    });
                } else {
                    return result;
                }
            });
            return /* @__PURE__ */ (0,jsx_runtime_.jsx)(jsx_runtime_.Fragment, {
                children: serialized
            });
        } else {
            return fallback != null ? /* @__PURE__ */ (0,jsx_runtime_.jsx)(jsx_runtime_.Fragment, {
                children: fallback
            }) : null;
        }
    }, [
        field,
        internalLinkComponent,
        externalLinkComponent,
        components,
        linkResolver,
        fallback
    ]);
}
 //# sourceMappingURL=PrismicRichText.js.map


/***/ })

};
;