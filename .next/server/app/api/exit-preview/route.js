"use strict";
(() => {
var exports = {};
exports.id = 933;
exports.ids = [933];
exports.modules = {

/***/ 2037:
/***/ ((module) => {

module.exports = require("os");

/***/ }),

/***/ 4149:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  headerHooks: () => (/* binding */ headerHooks),
  originalPathname: () => (/* binding */ originalPathname),
  requestAsyncStorage: () => (/* binding */ requestAsyncStorage),
  routeModule: () => (/* binding */ routeModule),
  serverHooks: () => (/* binding */ serverHooks),
  staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage),
  staticGenerationBailout: () => (/* binding */ staticGenerationBailout)
});

// NAMESPACE OBJECT: ./src/app/api/exit-preview/route.js
var route_namespaceObject = {};
__webpack_require__.r(route_namespaceObject);
__webpack_require__.d(route_namespaceObject, {
  GET: () => (GET)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/node-polyfill-headers.js
var node_polyfill_headers = __webpack_require__(2394);
// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-modules/app-route/module.js
var app_route_module = __webpack_require__(9692);
// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-kind.js
var route_kind = __webpack_require__(9513);
// EXTERNAL MODULE: ./node_modules/next/headers.js
var headers = __webpack_require__(63);
;// CONCATENATED MODULE: ./node_modules/@prismicio/next/dist/exitPreview.js

function exitPreview(config) {
    if (config == null ? void 0 : config.res) {
        config.res.clearPreviewData();
        config.res.setHeader("Cache-Control", "no-store");
        config.res.json({
            success: true
        });
        return;
    } else {
        (0,headers.draftMode)().disable();
        return new Response(JSON.stringify({
            success: true
        }), {
            headers: {
                "Cache-Control": "no-store"
            }
        });
    }
}
 //# sourceMappingURL=exitPreview.js.map

;// CONCATENATED MODULE: ./src/app/api/exit-preview/route.js

async function GET() {
    return await exitPreview();
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?page=%2Fapi%2Fexit-preview%2Froute&name=app%2Fapi%2Fexit-preview%2Froute&pagePath=private-next-app-dir%2Fapi%2Fexit-preview%2Froute.js&appDir=%2FUsers%2Felodie%2Fbonjouridol%2Fsrc%2Fapp&appPaths=%2Fapi%2Fexit-preview%2Froute&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!

// @ts-ignore this need to be imported from next/dist to be external


// @ts-expect-error - replaced by webpack/turbopack loader

const AppRouteRouteModule = app_route_module.AppRouteRouteModule;
// We inject the nextConfigOutput here so that we can use them in the route
// module.
const nextConfigOutput = ""
const routeModule = new AppRouteRouteModule({
    definition: {
        kind: route_kind.RouteKind.APP_ROUTE,
        page: "/api/exit-preview/route",
        pathname: "/api/exit-preview",
        filename: "route",
        bundlePath: "app/api/exit-preview/route"
    },
    resolvedPagePath: "/Users/elodie/bonjouridol/src/app/api/exit-preview/route.js",
    nextConfigOutput,
    userland: route_namespaceObject
});
// Pull out the exports that we need to expose from the module. This should
// be eliminated when we've moved the other routes to the new format. These
// are used to hook into the route.
const { requestAsyncStorage , staticGenerationAsyncStorage , serverHooks , headerHooks , staticGenerationBailout  } = routeModule;
const originalPathname = "/api/exit-preview/route";


//# sourceMappingURL=app-route.js.map

/***/ }),

/***/ 63:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


module.exports = __webpack_require__(4937);


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [326,501], () => (__webpack_exec__(4149)));
module.exports = __webpack_exports__;

})();