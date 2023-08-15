exports.id = 72;
exports.ids = [72];
exports.modules = {

/***/ 3072:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6786);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _prismicio_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3232);
/* harmony import */ var _RichText_module_scss__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(771);
/* harmony import */ var _RichText_module_scss__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_RichText_module_scss__WEBPACK_IMPORTED_MODULE_2__);
/**
 * @typedef {import("@prismicio/client").Content.RichTextSlice} RichTextSlice
 * @typedef {import("@prismicio/react").SliceComponentProps<RichTextSlice>} RichTextProps
 * @param {RichTextProps}
 */ 


const RichText = ({ slice })=>{
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("section", {
        "data-slice-type": slice.slice_type,
        "data-slice-variation": slice.variation,
        children: [
            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_prismicio_react__WEBPACK_IMPORTED_MODULE_1__/* .PrismicRichText */ .v, {
                field: slice.primary.title
            }),
            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_prismicio_react__WEBPACK_IMPORTED_MODULE_1__/* .PrismicRichText */ .v, {
                field: slice.primary.content
            }),
            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                className: (_RichText_module_scss__WEBPACK_IMPORTED_MODULE_2___default().repeatable),
                children: slice.items.map((item)=>/*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_prismicio_react__WEBPACK_IMPORTED_MODULE_1__/* .PrismicRichText */ .v, {
                        field: item.text
                    }))
            })
        ]
    });
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (RichText);


/***/ }),

/***/ 771:
/***/ ((module) => {

// Exports
module.exports = {
	"repeatable": "RichText_repeatable__O6Zc8"
};


/***/ })

};
;