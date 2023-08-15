"use strict";
exports.id = 980;
exports.ids = [980];
exports.modules = {

/***/ 6258:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  PrismicToolbar: () => (/* binding */ PrismicToolbar)
});

// EXTERNAL MODULE: external "next/dist/compiled/react"
var react_ = __webpack_require__(8038);
;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/errors/PrismicError.js
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class PrismicError extends Error {
  constructor(message = "An invalid API response was returned", url, response) {
    super(message);
    __publicField(this, "url");
    __publicField(this, "response");
    this.url = url;
    this.response = response;
  }
}

//# sourceMappingURL=PrismicError.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/isRepositoryName.js
const isRepositoryName = (input) => {
  return /^[a-zA-Z0-9][-a-zA-Z0-9]{2,}[a-zA-Z0-9]$/.test(input);
};

//# sourceMappingURL=isRepositoryName.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/getToolbarSrc.js


const getToolbarSrc = (repositoryName) => {
  if (isRepositoryName(repositoryName)) {
    return `https://static.cdn.prismic.io/prismic.js?new=true&repo=${repositoryName}`;
  } else {
    throw new PrismicError(`An invalid Prismic repository name was given: ${repositoryName}`, void 0, void 0);
  }
};

//# sourceMappingURL=getToolbarSrc.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/PrismicToolbar.js
'use client';
'use client';



const PrismicToolbar = ({ repositoryName }) => {
  const src = getToolbarSrc(repositoryName);
  react_.useEffect(() => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.dataset.prismicToolbar = "";
      script.dataset.repositoryName = repositoryName;
      if (typeof process !== "undefined" && "production" === "test") {}
      document.body.appendChild(script);
    }
  }, [repositoryName, src]);
  return null;
};

//# sourceMappingURL=PrismicToolbar.js.map


/***/ }),

/***/ 3340:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Z: () => (/* binding */ e0)
/* harmony export */ });
/* harmony import */ var next_dist_build_webpack_loaders_next_flight_loader_module_proxy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1363);

const proxy = (0,next_dist_build_webpack_loaders_next_flight_loader_module_proxy__WEBPACK_IMPORTED_MODULE_0__.createProxy)(String.raw`/Users/elodie/bonjouridol/node_modules/@prismicio/next/dist/PrismicNextImage.js`)

// Accessing the __esModule property and exporting $$typeof are required here.
// The __esModule getter forces the proxy target to create the default export
// and the $$typeof value is for rendering logic to determine if the module
// is a client boundary.
const { __esModule, $$typeof } = proxy;
const __default__ = proxy.default;

const e0 = proxy["PrismicNextImage"];


/***/ }),

/***/ 6794:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  K: () => (/* binding */ PrismicText)
});

// EXTERNAL MODULE: external "next/dist/compiled/react/jsx-runtime"
var jsx_runtime_ = __webpack_require__(6786);
// EXTERNAL MODULE: ./node_modules/next/dist/compiled/react/react.shared-subset.js
var react_shared_subset = __webpack_require__(2947);
// EXTERNAL MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/helpers/isFilled.js
var isFilled = __webpack_require__(5405);
;// CONCATENATED MODULE: ./node_modules/@prismicio/richtext/dist/asText.js
const asText = (richTextField, separator = " ")=>{
    let result = "";
    for(let i = 0; i < richTextField.length; i++){
        if ("text" in richTextField[i]) {
            result += (result ? separator : "") + richTextField[i].text;
        }
    }
    return result;
};
 //# sourceMappingURL=asText.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/_node_modules/@prismicio/client/dist/helpers/asText.js

const asText_asText = (richTextField, ...configObjectOrTuple)=>{
    if (richTextField) {
        const [configObjectOrSeparator] = configObjectOrTuple;
        let config;
        if (typeof configObjectOrSeparator === "string") {
            config = {
                separator: configObjectOrSeparator
            };
        } else {
            config = {
                ...configObjectOrSeparator
            };
        }
        return asText(richTextField, config.separator);
    } else {
        return null;
    }
};
 //# sourceMappingURL=asText.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/PrismicText.js





const PrismicText = (props)=>{
    if (typeof process !== "undefined" && "production" === "development") {}
    return react_shared_subset.useMemo(()=>{
        if ((0,isFilled/* richText */.qO)(props.field)) {
            const text = asText_asText(props.field, props.separator);
            return /* @__PURE__ */ (0,jsx_runtime_.jsx)(jsx_runtime_.Fragment, {
                children: text
            });
        } else {
            return props.fallback != null ? /* @__PURE__ */ (0,jsx_runtime_.jsx)(jsx_runtime_.Fragment, {
                children: props.fallback
            }) : null;
        }
    }, [
        props.field,
        props.fallback,
        props.separator
    ]);
};
 //# sourceMappingURL=PrismicText.js.map


/***/ }),

/***/ 8478:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  p: () => (/* binding */ SliceZone)
});

// UNUSED EXPORTS: TODOSliceComponent

// EXTERNAL MODULE: external "next/dist/compiled/react/jsx-runtime"
var jsx_runtime_ = __webpack_require__(6786);
;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/lib/pascalCase.js
const pascalCase = (input)=>{
    const camelCased = input.replace(/(?:-|_)(\w)/g, (_, c)=>{
        return c ? c.toUpperCase() : "";
    });
    return camelCased[0].toUpperCase() + camelCased.slice(1);
};
 //# sourceMappingURL=pascalCase.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/SliceZone.js


const TODOSliceComponent = ({ slice })=>{
    if (typeof process !== "undefined" && "production" === "development") {} else {
        return null;
    }
};
function SliceZone({ slices = [], components = {}, resolver, defaultComponent = TODOSliceComponent, context = {} }) {
    if (false) {}
    const renderedSlices = slices.map((slice, index)=>{
        const type = "slice_type" in slice ? slice.slice_type : slice.type;
        let Comp = components[type] || defaultComponent;
        if (resolver) {
            const resolvedComp = resolver({
                slice,
                sliceName: pascalCase(type),
                i: index
            });
            if (resolvedComp) {
                Comp = resolvedComp;
            }
        }
        const key = "id" in slice && slice.id ? slice.id : `${index}-${JSON.stringify(slice)}`;
        if (slice.__mapped) {
            const { __mapped, ...mappedProps } = slice;
            return /* @__PURE__ */ (0,jsx_runtime_.jsx)(Comp, {
                ...mappedProps
            }, key);
        } else {
            return /* @__PURE__ */ (0,jsx_runtime_.jsx)(Comp, {
                slice,
                index,
                slices,
                context
            }, key);
        }
    });
    return /* @__PURE__ */ (0,jsx_runtime_.jsx)(jsx_runtime_.Fragment, {
        children: renderedSlices
    });
}
 //# sourceMappingURL=SliceZone.js.map


/***/ }),

/***/ 5405:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   p4: () => (/* binding */ link),
/* harmony export */   qO: () => (/* binding */ richText)
/* harmony export */ });
/* unused harmony export imageThumbnail */
const isNonNullish = (input)=>{
    return input != null;
};
const richText = (field)=>{
    if (!isNonNullish(field)) {
        return false;
    } else if (field.length === 1 && "text" in field[0]) {
        return !!field[0].text;
    } else {
        return !!field.length;
    }
};
const imageThumbnail = (thumbnail)=>{
    return isNonNullish(thumbnail) && !!thumbnail.url;
};
const link = (field)=>{
    return isNonNullish(field) && ("id" in field || "url" in field);
};
 //# sourceMappingURL=isFilled.js.map


/***/ }),

/***/ 2964:
/***/ ((module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "default", ({
    enumerable: true,
    get: function() {
        return dynamic;
    }
}));
const _interop_require_default = __webpack_require__(3297);
const _react = /*#__PURE__*/ _interop_require_default._(__webpack_require__(2947));
const _loadable = /*#__PURE__*/ _interop_require_default._(__webpack_require__(2303));
// Normalize loader to return the module as form { default: Component } for `React.lazy`.
// Also for backward compatible since next/dynamic allows to resolve a component directly with loader
// Client component reference proxy need to be converted to a module.
function convertModule(mod) {
    return {
        default: (mod == null ? void 0 : mod.default) || mod
    };
}
function dynamic(dynamicOptions, options) {
    const loadableFn = _loadable.default;
    const loadableOptions = {
        // A loading component is not required, so we default it
        loading: (param)=>{
            let { error, isLoading, pastDelay } = param;
            if (!pastDelay) return null;
            if (false) {}
            return null;
        }
    };
    if (typeof dynamicOptions === "function") {
        loadableOptions.loader = dynamicOptions;
    }
    Object.assign(loadableOptions, options);
    const loaderFn = loadableOptions.loader;
    const loader = ()=>loaderFn != null ? loaderFn().then(convertModule) : Promise.resolve(convertModule(()=>null));
    return loadableFn({
        ...loadableOptions,
        loader: loader
    });
}
if ((typeof exports.default === "function" || typeof exports.default === "object" && exports.default !== null) && typeof exports.default.__esModule === "undefined") {
    Object.defineProperty(exports.default, "__esModule", {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=app-dynamic.js.map


/***/ }),

/***/ 5070:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* __next_internal_client_entry_do_not_use__  cjs */ 
const { createProxy } = __webpack_require__(1363);
module.exports = createProxy("/Users/elodie/bonjouridol/node_modules/next/dist/shared/lib/lazy-dynamic/dynamic-no-ssr.js");
 //# sourceMappingURL=dynamic-no-ssr.js.map


/***/ }),

/***/ 2303:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "default", ({
    enumerable: true,
    get: function() {
        return _default;
    }
}));
const _interop_require_default = __webpack_require__(3297);
const _react = /*#__PURE__*/ _interop_require_default._(__webpack_require__(2947));
const _dynamicnossr = __webpack_require__(5070);
function Loadable(options) {
    const opts = Object.assign({
        loader: null,
        loading: null,
        ssr: true
    }, options);
    opts.lazy = /*#__PURE__*/ _react.default.lazy(opts.loader);
    function LoadableComponent(props) {
        const Loading = opts.loading;
        const fallbackElement = /*#__PURE__*/ _react.default.createElement(Loading, {
            isLoading: true,
            pastDelay: true,
            error: null
        });
        const Wrap = opts.ssr ? _react.default.Fragment : _dynamicnossr.NoSSR;
        const Lazy = opts.lazy;
        return /*#__PURE__*/ _react.default.createElement(_react.default.Suspense, {
            fallback: fallbackElement
        }, /*#__PURE__*/ _react.default.createElement(Wrap, null, /*#__PURE__*/ _react.default.createElement(Lazy, props)));
    }
    LoadableComponent.displayName = "LoadableComponent";
    return LoadableComponent;
}
const _default = Loadable; //# sourceMappingURL=loadable.js.map


/***/ })

};
;