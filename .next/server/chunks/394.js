"use strict";
exports.id = 394;
exports.ids = [394];
exports.modules = {

/***/ 7394:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  e: () => (/* binding */ prismicio_createClient),
  A: () => (/* binding */ repositoryName)
});

// EXTERNAL MODULE: ./node_modules/@prismicio/client/dist/createClient.js + 25 modules
var createClient = __webpack_require__(9632);
// EXTERNAL MODULE: ./node_modules/@prismicio/next/dist/enableAutoPreviews.js
var enableAutoPreviews = __webpack_require__(7790);
;// CONCATENATED MODULE: ./slicemachine.config.json
const slicemachine_config_namespaceObject = {"AF":"bonjouridol"};
;// CONCATENATED MODULE: ./src/prismicio.js



/**
 * The project's Prismic repository name.
 */ const repositoryName = slicemachine_config_namespaceObject.AF;
/**
 * A list of Route Resolver objects that define how a document's `url` field is resolved.
 *
 * {@link https://prismic.io/docs/route-resolver#route-resolver}
 *
 * @type {prismic.ClientConfig["routes"]}
 */ // TODO: Update the routes array to match your project's route structure.
const routes = [
    {
        type: "homepage",
        path: "/"
    },
    {
        type: "articles",
        path: "/articles/:uid"
    }
];
/**
 * Creates a Prismic client for the project's repository. The client is used to
 * query content from the Prismic API.
 *
 * @param {prismicNext.CreateClientConfig} config - Configuration for the Prismic client.
 */ const prismicio_createClient = (config = {})=>{
    const client = createClient/* createClient */.eI(repositoryName, {
        routes,
        fetchOptions:  true ? {
            next: {
                tags: [
                    "prismic"
                ]
            },
            cache: "force-cache"
        } : 0,
        ...config
    });
    enableAutoPreviews/* enableAutoPreviews */.L({
        client,
        previewData: config.previewData,
        req: config.req
    });
    return client;
};


/***/ })

};
;