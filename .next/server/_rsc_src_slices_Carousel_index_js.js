/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_src_slices_Carousel_index_js";
exports.ids = ["_rsc_src_slices_Carousel_index_js"];
exports.modules = {

/***/ "(rsc)/./src/slices/Carousel/page.module.scss":
/*!**********************************************!*\
  !*** ./src/slices/Carousel/page.module.scss ***!
  \**********************************************/
/***/ ((module) => {

eval("// Exports\nmodule.exports = {\n\t\"Carousel\": \"page_Carousel__rw_Tp\"\n};\n\nmodule.exports.__checksum = \"a71fb6355cfa\"\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvc2xpY2VzL0Nhcm91c2VsL3BhZ2UubW9kdWxlLnNjc3MiLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUEseUJBQXlCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYm9uam91cmlkb2wtc2l0ZS8uL3NyYy9zbGljZXMvQ2Fyb3VzZWwvcGFnZS5tb2R1bGUuc2Nzcz82ZjI4Il0sInNvdXJjZXNDb250ZW50IjpbIi8vIEV4cG9ydHNcbm1vZHVsZS5leHBvcnRzID0ge1xuXHRcIkNhcm91c2VsXCI6IFwicGFnZV9DYXJvdXNlbF9fcndfVHBcIlxufTtcblxubW9kdWxlLmV4cG9ydHMuX19jaGVja3N1bSA9IFwiYTcxZmI2MzU1Y2ZhXCJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./src/slices/Carousel/page.module.scss\n");

/***/ }),

/***/ "(rsc)/./src/app/components/Carousel.js":
/*!****************************************!*\
  !*** ./src/app/components/Carousel.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $$typeof: () => (/* binding */ $$typeof),
/* harmony export */   __esModule: () => (/* binding */ __esModule),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var next_dist_build_webpack_loaders_next_flight_loader_module_proxy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/build/webpack/loaders/next-flight-loader/module-proxy */ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-loader/module-proxy.js");

const proxy = (0,next_dist_build_webpack_loaders_next_flight_loader_module_proxy__WEBPACK_IMPORTED_MODULE_0__.createProxy)(String.raw`/Users/elodie/Documents/GitHub/bonjouridol/src/app/components/Carousel.js`)

// Accessing the __esModule property and exporting $$typeof are required here.
// The __esModule getter forces the proxy target to create the default export
// and the $$typeof value is for rendering logic to determine if the module
// is a client boundary.
const { __esModule, $$typeof } = proxy;
const __default__ = proxy.default;


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__default__);

/***/ }),

/***/ "(rsc)/./src/slices/Carousel/index.js":
/*!**************************************!*\
  !*** ./src/slices/Carousel/index.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-page/vendored/rsc/react.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _app_components_Carousel__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/app/components/Carousel */ \"(rsc)/./src/app/components/Carousel.js\");\n/* harmony import */ var _page_module_scss__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./page.module.scss */ \"(rsc)/./src/slices/Carousel/page.module.scss\");\n/* harmony import */ var _page_module_scss__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_page_module_scss__WEBPACK_IMPORTED_MODULE_3__);\n/**\n * @typedef {import(\"@prismicio/client\").Content.CarouselSlice} CarouselSlice\n * @typedef {import(\"@prismicio/react\").SliceComponentProps<CarouselSlice>} CarouselProps\n * @param {CarouselProps}\n */ \n\n\n\nconst ImageCarousel = ({ slice })=>{\n    const images = slice.primary.slides;\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"section\", {\n        \"data-slice-type\": slice.slice_type,\n        \"data-slice-variation\": slice.variation,\n        className: (_page_module_scss__WEBPACK_IMPORTED_MODULE_3___default().Carousel),\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_app_components_Carousel__WEBPACK_IMPORTED_MODULE_2__[\"default\"], {\n            images: images\n        }, void 0, false, {\n            fileName: \"/Users/elodie/Documents/GitHub/bonjouridol/src/slices/Carousel/index.js\",\n            lineNumber: 20,\n            columnNumber: 7\n        }, undefined)\n    }, void 0, false, {\n        fileName: \"/Users/elodie/Documents/GitHub/bonjouridol/src/slices/Carousel/index.js\",\n        lineNumber: 15,\n        columnNumber: 5\n    }, undefined);\n};\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ImageCarousel);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvc2xpY2VzL0Nhcm91c2VsL2luZGV4LmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUE7Ozs7Q0FJQztBQUV5QjtBQUN1QjtBQUNUO0FBRXhDLE1BQU1HLGdCQUFnQixDQUFDLEVBQUVDLEtBQUssRUFBRTtJQUM5QixNQUFNQyxTQUFTRCxNQUFNRSxPQUFPLENBQUNDLE1BQU07SUFFbkMscUJBQ0UsOERBQUNDO1FBQ0NDLG1CQUFpQkwsTUFBTU0sVUFBVTtRQUNqQ0Msd0JBQXNCUCxNQUFNUSxTQUFTO1FBQ3JDQyxXQUFXWCxtRUFBZTtrQkFFMUIsNEVBQUNELGdFQUFRQTtZQUFDSSxRQUFRQTs7Ozs7Ozs7Ozs7QUFHeEI7QUFFQSxpRUFBZUYsYUFBYUEsRUFBQyIsInNvdXJjZXMiOlsid2VicGFjazovL2JvbmpvdXJpZG9sLXNpdGUvLi9zcmMvc2xpY2VzL0Nhcm91c2VsL2luZGV4LmpzPzg0ZjUiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAdHlwZWRlZiB7aW1wb3J0KFwiQHByaXNtaWNpby9jbGllbnRcIikuQ29udGVudC5DYXJvdXNlbFNsaWNlfSBDYXJvdXNlbFNsaWNlXG4gKiBAdHlwZWRlZiB7aW1wb3J0KFwiQHByaXNtaWNpby9yZWFjdFwiKS5TbGljZUNvbXBvbmVudFByb3BzPENhcm91c2VsU2xpY2U+fSBDYXJvdXNlbFByb3BzXG4gKiBAcGFyYW0ge0Nhcm91c2VsUHJvcHN9XG4gKi9cblxuaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IENhcm91c2VsIGZyb20gXCJAL2FwcC9jb21wb25lbnRzL0Nhcm91c2VsXCI7XG5pbXBvcnQgc3R5bGVzIGZyb20gXCIuL3BhZ2UubW9kdWxlLnNjc3NcIjtcblxuY29uc3QgSW1hZ2VDYXJvdXNlbCA9ICh7IHNsaWNlIH0pID0+IHtcbiAgY29uc3QgaW1hZ2VzID0gc2xpY2UucHJpbWFyeS5zbGlkZXM7XG5cbiAgcmV0dXJuIChcbiAgICA8c2VjdGlvblxuICAgICAgZGF0YS1zbGljZS10eXBlPXtzbGljZS5zbGljZV90eXBlfVxuICAgICAgZGF0YS1zbGljZS12YXJpYXRpb249e3NsaWNlLnZhcmlhdGlvbn1cbiAgICAgIGNsYXNzTmFtZT17c3R5bGVzLkNhcm91c2VsfVxuICAgID5cbiAgICAgIDxDYXJvdXNlbCBpbWFnZXM9e2ltYWdlc30gLz5cbiAgICA8L3NlY3Rpb24+XG4gICk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBJbWFnZUNhcm91c2VsO1xuIl0sIm5hbWVzIjpbIlJlYWN0IiwiQ2Fyb3VzZWwiLCJzdHlsZXMiLCJJbWFnZUNhcm91c2VsIiwic2xpY2UiLCJpbWFnZXMiLCJwcmltYXJ5Iiwic2xpZGVzIiwic2VjdGlvbiIsImRhdGEtc2xpY2UtdHlwZSIsInNsaWNlX3R5cGUiLCJkYXRhLXNsaWNlLXZhcmlhdGlvbiIsInZhcmlhdGlvbiIsImNsYXNzTmFtZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./src/slices/Carousel/index.js\n");

/***/ })

};
;