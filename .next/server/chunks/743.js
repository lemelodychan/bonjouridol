"use strict";
exports.id = 743;
exports.ids = [743];
exports.modules = {

/***/ 6466:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  p: () => (/* binding */ SliceZone)
});

// UNUSED EXPORTS: TODOSliceComponent

// EXTERNAL MODULE: external "next/dist/compiled/react/jsx-runtime"
var jsx_runtime_ = __webpack_require__(6786);
;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/lib/pascalCase.js
const pascalCase = (input) => {
  const camelCased = input.replace(/(?:-|_)(\w)/g, (_, c) => {
    return c ? c.toUpperCase() : "";
  });
  return camelCased[0].toUpperCase() + camelCased.slice(1);
};

//# sourceMappingURL=pascalCase.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/react/dist/SliceZone.js


const TODOSliceComponent = ({ slice }) => {
  if (typeof process !== "undefined" && "production" === "development") {} else {
    return null;
  }
};
function SliceZone({ slices = [], components = {}, resolver, defaultComponent = TODOSliceComponent, context = {} }) {
  if (false) {}
  const renderedSlices = slices.map((slice, index) => {
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
      return /* @__PURE__ */ (0,jsx_runtime_.jsx)(Comp, { ...mappedProps }, key);
    } else {
      return /* @__PURE__ */ (0,jsx_runtime_.jsx)(Comp, { slice, index, slices, context }, key);
    }
  });
  return /* @__PURE__ */ (0,jsx_runtime_.jsx)(jsx_runtime_.Fragment, { children: renderedSlices });
}

//# sourceMappingURL=SliceZone.js.map


/***/ }),

/***/ 7335:
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
const _interop_require_default = __webpack_require__(2147);
const _react = /*#__PURE__*/ _interop_require_default._(__webpack_require__(8038));
const _loadable = /*#__PURE__*/ _interop_require_default._(__webpack_require__(1464));
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

/***/ 1464:
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
const _interop_require_default = __webpack_require__(2147);
const _react = /*#__PURE__*/ _interop_require_default._(__webpack_require__(8038));
const _dynamicnossr = __webpack_require__(9708);
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


/***/ }),

/***/ 3443:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*!
 * statuses
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module dependencies.
 * @private
 */

var codes = __webpack_require__(2359)

/**
 * Module exports.
 * @public
 */

module.exports = status

// status code to message map
status.message = codes

// status message (lower-case) to code map
status.code = createMessageToStatusCodeMap(codes)

// array of status codes
status.codes = createStatusCodeList(codes)

// status codes for redirects
status.redirect = {
  300: true,
  301: true,
  302: true,
  303: true,
  305: true,
  307: true,
  308: true
}

// status codes for empty bodies
status.empty = {
  204: true,
  205: true,
  304: true
}

// status codes for when you should retry the request
status.retry = {
  502: true,
  503: true,
  504: true
}

/**
 * Create a map of message to status code.
 * @private
 */

function createMessageToStatusCodeMap (codes) {
  var map = {}

  Object.keys(codes).forEach(function forEachCode (code) {
    var message = codes[code]
    var status = Number(code)

    // populate map
    map[message.toLowerCase()] = status
  })

  return map
}

/**
 * Create a list of all status codes.
 * @private
 */

function createStatusCodeList (codes) {
  return Object.keys(codes).map(function mapCode (code) {
    return Number(code)
  })
}

/**
 * Get the status code for given message.
 * @private
 */

function getStatusCode (message) {
  var msg = message.toLowerCase()

  if (!Object.prototype.hasOwnProperty.call(status.code, msg)) {
    throw new Error('invalid status message: "' + message + '"')
  }

  return status.code[msg]
}

/**
 * Get the status message for given code.
 * @private
 */

function getStatusMessage (code) {
  if (!Object.prototype.hasOwnProperty.call(status.message, code)) {
    throw new Error('invalid status code: ' + code)
  }

  return status.message[code]
}

/**
 * Get the status code.
 *
 * Given a number, this will throw if it is not a known status
 * code, otherwise the code will be returned. Given a string,
 * the string will be parsed for a number and return the code
 * if valid, otherwise will lookup the code assuming this is
 * the status message.
 *
 * @param {string|number} code
 * @returns {number}
 * @public
 */

function status (code) {
  if (typeof code === 'number') {
    return getStatusMessage(code)
  }

  if (typeof code !== 'string') {
    throw new TypeError('code must be a number or string')
  }

  // '403'
  var n = parseInt(code, 10)
  if (!isNaN(n)) {
    return getStatusMessage(n)
  }

  return getStatusCode(code)
}


/***/ }),

/***/ 2422:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  i: () => (/* reexport */ SliceSimulator)
});

// EXTERNAL MODULE: external "next/dist/compiled/react/jsx-runtime"
var jsx_runtime_ = __webpack_require__(6786);
// EXTERNAL MODULE: external "next/dist/compiled/react"
var react_ = __webpack_require__(8038);
;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/lib/throttle.js
const throttle = (fn, delay = 16) => {
  let lastExec = 0;
  let timer = null;
  return function(...args) {
    const now = Date.now();
    const delta = now - lastExec;
    if (delta >= delay) {
      fn.apply(this, args);
      lastExec = now;
    } else {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        fn.apply(this, args);
        lastExec = Date.now();
      }, delay - delta);
    }
  };
};

//# sourceMappingURL=throttle.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/types.js
var APIRequestType;
(function(APIRequestType2) {
  APIRequestType2["SetActiveSlice"] = "setActiveSlice";
  APIRequestType2["SetSliceZoneSize"] = "setSliceZoneSize";
})(APIRequestType || (APIRequestType = {}));
var ClientRequestType;
(function(ClientRequestType2) {
  ClientRequestType2["Ping"] = "ping";
  ClientRequestType2["SetSliceZone"] = "setSliceZone";
  ClientRequestType2["ScrollToSlice"] = "scrollToSlice";
})(ClientRequestType || (ClientRequestType = {}));

//# sourceMappingURL=types.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/kit/types.js
var StateEventType;
(function(StateEventType2) {
  StateEventType2["Slices"] = "slices";
  StateEventType2["ActiveSlice"] = "activeSlice";
  StateEventType2["Message"] = "message";
})(StateEventType || (StateEventType = {}));

//# sourceMappingURL=types.js.map

// EXTERNAL MODULE: ./node_modules/statuses/index.js
var statuses = __webpack_require__(3443);
;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/channel/types.js
var InternalEmitterRequestType;
(function(InternalEmitterRequestType2) {
  InternalEmitterRequestType2["Connect"] = "connect";
})(InternalEmitterRequestType || (InternalEmitterRequestType = {}));
var InternalReceiverRequestType;
(function(InternalReceiverRequestType2) {
  InternalReceiverRequestType2["Ready"] = "ready";
})(InternalReceiverRequestType || (InternalReceiverRequestType = {}));

//# sourceMappingURL=types.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/channel/errors.js
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class ResponseError extends Error {
  constructor(errorResponse) {
    super(errorResponse.msg);
    __publicField(this, "response");
    this.response = errorResponse;
  }
}
class ConnectionTimeoutError extends (/* unused pure expression or super */ null && (Error)) {
  constructor() {
    super("Connection timed out");
  }
}
class TooManyConcurrentRequestsError extends Error {
  constructor(request) {
    super(`Too many concurrent requests`);
    __publicField(this, "request");
    this.request = request;
  }
}
class RequestTimeoutError extends Error {
  constructor(request) {
    super(`Request \`${request.requestID}\` timed out`);
    __publicField(this, "request");
    this.request = request;
  }
}
class NotReadyError extends Error {
}
class PortNotSetError extends Error {
  constructor() {
    super("Port is not set");
  }
}
class ChannelNotSetError extends (/* unused pure expression or super */ null && (Error)) {
  constructor() {
    super("Channel is not set");
  }
}

//# sourceMappingURL=errors.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/channel/messages.js

let requestID = 0;
const createRequestMessage = (type, data, prefix = "") => {
  return {
    requestID: `${prefix}${requestID++}`,
    type,
    data
  };
};
const createSuccessResponseMessage = (requestID2, data, status = 200) => {
  var _a;
  if (status >= 400) {
    throw new TypeError(`Invalid success status code, expected status to be within \`[100;400[\`, got \`${status}\``);
  }
  return {
    requestID: requestID2,
    status,
    msg: ((_a = statuses.message[status]) == null ? void 0 : _a.replace(/\.$/, "").toLowerCase()) ?? "",
    data
  };
};
const createErrorResponseMessage = (requestID2, error, status = 400) => {
  var _a;
  if (status < 400) {
    throw new TypeError(`Invalid error status code, expected status to be within \`[500;600[\`, got \`${status}\``);
  }
  return {
    requestID: requestID2,
    status,
    msg: ((_a = statuses.message[status]) == null ? void 0 : _a.replace(/\.$/, "").toLowerCase()) ?? "",
    error
  };
};
const validateMessage = (message) => {
  if (typeof message !== "object" || message === null) {
    throw new TypeError(`Invalid message received, expected message to be of type \`object\`, got \`${typeof message}\``);
  } else if (!Object.keys(message).every((key) => ["requestID", "type", "data", "status", "msg", "error"].includes(key))) {
    throw new TypeError(`Invalid message received: ${JSON.stringify(message)}`);
  } else if (typeof message.requestID !== "string") {
    throw new TypeError(`Invalid message received, expected \`message.requestID\` to be of type \`string\`, got \`${typeof message.id}\``);
  }
  return message;
};
const isRequestMessage = (message) => {
  return "type" in message;
};
const isResponseMessage = (message) => {
  return !("type" in message);
};
const isSuccessResponseMessage = (message) => {
  return isResponseMessage(message) && !("error" in message);
};
const isErrorResponseMessage = (message) => {
  return isResponseMessage(message) && !("data" in message);
};

//# sourceMappingURL=messages.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/channel/ChannelNetwork.js
var ChannelNetwork_defProp = Object.defineProperty;
var ChannelNetwork_defNormalProp = (obj, key, value) => key in obj ? ChannelNetwork_defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var ChannelNetwork_publicField = (obj, key, value) => {
  ChannelNetwork_defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};


const channelNetworkDefaultOptions = {
  debug: false,
  maximumRequestConcurrency: 20,
  defaultTimeout: 5e3,
  requestIDPrefix: "channel-"
};
class ChannelNetwork {
  constructor(requestHandlers, options) {
    ChannelNetwork_publicField(this, "requestHandlers");
    ChannelNetwork_publicField(this, "options");
    ChannelNetwork_publicField(this, "_port", null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ChannelNetwork_publicField(this, "_pendingRequests", /* @__PURE__ */ new Map());
    this.requestHandlers = requestHandlers;
    this.options = { ...channelNetworkDefaultOptions, ...options };
  }
  get port() {
    if (!this._port) {
      throw new PortNotSetError();
    }
    return this._port;
  }
  set port(port) {
    if (this._port) {
      this._port.onmessage = null;
    }
    this._port = port;
    if (this._port) {
      this._port.onmessage = this.onMessage.bind(this);
    }
  }
  createRequestMessage(type, data) {
    return createRequestMessage(type, data, this.options.requestIDPrefix);
  }
  async onMessage(event) {
    if (this.options.debug) {
      console.debug(event.data);
    }
    try {
      const message = validateMessage(event.data);
      if (isRequestMessage(message)) {
        if (!this.requestHandlers[message.type]) {
          this.postResponse(createErrorResponseMessage(message.requestID, void 0, 501));
        } else {
          try {
            const response = await this.requestHandlers[message.type](message, {
              success: createSuccessResponseMessage.bind(this, message.requestID),
              error: createErrorResponseMessage.bind(this, message.requestID)
            });
            this.postResponse(response);
          } catch (error) {
            this.postResponse(createErrorResponseMessage(message.requestID, error, 500));
          }
        }
      } else {
        if (!this._pendingRequests.has(message.requestID)) {
          console.error(`Unknown request ID received in response: ${JSON.stringify(message)}`);
        } else {
          this._pendingRequests.get(message.requestID)(message);
          this._pendingRequests.delete(message.requestID);
        }
      }
    } catch (error) {
      if (error instanceof TypeError) {
        console.warn(error.message);
      } else {
        throw error;
      }
    }
  }
  postRequest(request, postMessage = (request2) => this.port.postMessage(request2), options = {}) {
    if (this.options.debug) {
      console.debug(request);
    }
    if (this._pendingRequests.size >= this.options.maximumRequestConcurrency) {
      throw new TooManyConcurrentRequestsError(request);
    }
    return new Promise((resolve, reject) => {
      const requestTimeout = setTimeout(() => {
        if (this._pendingRequests.has(request.requestID)) {
          this._pendingRequests.delete(request.requestID);
        }
        reject(new RequestTimeoutError(request));
      }, options.timeout || this.options.defaultTimeout);
      this._pendingRequests.set(request.requestID, (response) => {
        clearTimeout(requestTimeout);
        isSuccessResponseMessage(response) ? resolve(response) : reject(new ResponseError(response));
      });
      postMessage(request);
    });
  }
  postResponse(response, postMessage = (response2) => this.port.postMessage(response2)) {
    if (this.options.debug) {
      console.debug(response);
    }
    postMessage(response);
    return response;
  }
}

//# sourceMappingURL=ChannelNetwork.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/channel/ChannelReceiver.js
var ChannelReceiver_defProp = Object.defineProperty;
var ChannelReceiver_defNormalProp = (obj, key, value) => key in obj ? ChannelReceiver_defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var ChannelReceiver_publicField = (obj, key, value) => {
  ChannelReceiver_defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};




const channelReceiverDefaultOptions = {
  readyTimeout: 2e4,
  requestIDPrefix: "receiver-"
};
class ChannelReceiver extends ChannelNetwork {
  constructor(requestHandlers, options) {
    super(requestHandlers, { ...channelReceiverDefaultOptions, ...options });
    ChannelReceiver_publicField(this, "_ready", false);
    window.addEventListener("message", (event) => {
      this._onPublicMessage(event);
    });
  }
  /**
   * Tells the emitter that receiver is ready
   */
  async ready() {
    if (window.parent === window) {
      throw new Error("Receiver is currently not embedded as an iframe");
    }
    this._ready = false;
    const request = this.createRequestMessage(InternalReceiverRequestType.Ready, void 0);
    const response = await this.postRequest(request, (request2) => {
      window.parent.postMessage(request2, "*");
    }, {
      timeout: this.options.readyTimeout
    });
    this._ready = true;
    return response;
  }
  /**
   * Handles public messages
   */
  _onPublicMessage(event) {
    try {
      const message = validateMessage(event.data);
      if (isRequestMessage(message)) {
        if (this.options.debug) {
          console.debug(event.data);
        }
        switch (message.type) {
          case InternalEmitterRequestType.Connect:
            this.port = event.ports[0];
            const { data } = message;
            this.options = {
              ...this.options,
              ...data,
              // Ensure core options remain the same
              debug: this.options.debug,
              requestIDPrefix: this.options.requestIDPrefix,
              readyTimeout: this.options.readyTimeout
            };
            const response = createSuccessResponseMessage(message.requestID, void 0);
            this.postResponse(response);
            break;
          default:
            this.postResponse(createErrorResponseMessage(message.requestID, void 0), (response2) => {
              event.source.postMessage(response2, event.origin);
            });
            break;
        }
      } else {
        if (!this._ready) {
          this.onMessage(event);
        }
      }
    } catch (error) {
      if (error instanceof TypeError)
        ;
      else {
        throw error;
      }
    }
  }
  postFormattedRequest(type, data, options = {}) {
    if (!this._ready) {
      throw new NotReadyError("Receiver is not ready, use `ChannelReceiver.ready()` first");
    }
    return this.postRequest(this.createRequestMessage(type, data), void 0, options);
  }
}

//# sourceMappingURL=ChannelReceiver.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/SimulatorAPI.js
var SimulatorAPI_defProp = Object.defineProperty;
var SimulatorAPI_defNormalProp = (obj, key, value) => key in obj ? SimulatorAPI_defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var SimulatorAPI_publicField = (obj, key, value) => {
  SimulatorAPI_defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var _a, _b;




const simulatorAPIDefaultOptions = {
  requestIDPrefix: "api-",
  activeSliceAPI: false,
  sliceZoneSizeAPI: false
};
class SimulatorAPI extends ChannelReceiver {
  constructor(requestHandlers, options) {
    var _a2, _b2;
    const debug = (options == null ? void 0 : options.debug) || /[?&]debug=true/i.test(decodeURIComponent(window.location.search));
    super({
      [ClientRequestType.Ping]: (_req, res) => {
        return res.success("pong");
      },
      ...requestHandlers
    }, {
      ...simulatorAPIDefaultOptions,
      ...options,
      debug
    });
    SimulatorAPI_publicField(this, _a, async (data) => {
      return await this.postFormattedRequest(APIRequestType.SetActiveSlice, data);
    });
    SimulatorAPI_publicField(this, _b, async (data) => {
      return await this.postFormattedRequest(APIRequestType.SetSliceZoneSize, data);
    });
    if (debug) {
      window.prismic || (window.prismic = {});
      (_a2 = window.prismic).sliceSimulator || (_a2.sliceSimulator = {});
      (_b2 = window.prismic.sliceSimulator).api || (_b2.api = []);
      window.prismic.sliceSimulator.api.push(this);
    }
  }
}
_a = APIRequestType.SetActiveSlice, _b = APIRequestType.SetSliceZoneSize;

//# sourceMappingURL=SimulatorAPI.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/lib/EventEmitter.js
var EventEmitter_defProp = Object.defineProperty;
var EventEmitter_defNormalProp = (obj, key, value) => key in obj ? EventEmitter_defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var EventEmitter_publicField = (obj, key, value) => {
  EventEmitter_defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class EventEmitter {
  constructor() {
    EventEmitter_publicField(this, "_listeners", {});
  }
  on(event, listener, key = null) {
    this._listeners[event] = [
      ...this._listeners[event] ?? [],
      [listener, key]
    ];
  }
  off(event, listenerOrKey) {
    this._listeners[event] = (this._listeners[event] ?? []).filter(([listener, key]) => typeof listenerOrKey === "function" ? listener !== listenerOrKey : key !== listenerOrKey);
  }
  emit(event, payload) {
    (this._listeners[event] ?? []).forEach((listener) => listener[0](payload));
  }
}

//# sourceMappingURL=EventEmitter.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/kit/domHelpers.js
const simulatorClass = "slice-simulator";
const simulatorRootClass = "slice-simulator--root";
const getSimulatorDOM = () => {
  return document.querySelector(`.${simulatorClass}`);
};
const getSimulatorRootDOM = () => {
  return document.querySelector(`.${simulatorRootClass}`);
};
const getSliceZoneDOM = (expectedNumberOfChildren) => {
  let node = document.querySelector(`.${simulatorClass} [data-slice-zone]`);
  if (node) {
    if (node.children.length !== expectedNumberOfChildren) {
      console.warn(`Flagged SliceZone has an unexpected number of children, found ${node.children.length} but expected ${expectedNumberOfChildren}. This might lead to unexpected behaviors. Are you sure you tagged the right element?`);
    }
    return node;
  }
  node = document.querySelector(`.${simulatorClass} .${simulatorRootClass}`);
  if (!node) {
    return null;
  }
  const searchDepth = 5;
  for (let i = 0; i < searchDepth; i++) {
    if (node.children.length === expectedNumberOfChildren) {
      return node;
    } else if (node.children.length) {
      node = node.children[0];
    } else {
      break;
    }
  }
  return null;
};
const getActiveSliceDOM = ($sliceZone, mouse) => {
  const raycast = document.elementsFromPoint(mouse.x, mouse.y).reverse();
  const sliceZoneIndex = raycast.indexOf($sliceZone);
  if (sliceZoneIndex === -1) {
    return null;
  }
  const $slice = raycast[sliceZoneIndex + 1];
  if (!$slice) {
    return null;
  }
  return $slice;
};

//# sourceMappingURL=domHelpers.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/kit/getDefault.js
const getDefaultProps = () => ({
  zIndex: 100,
  background: "#ffffff"
});
const getDefaultSlices = () => {
  return [];
};
const getDefaultMessage = () => {
  return "";
};

//# sourceMappingURL=getDefault.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/kit/State.js
var State_defProp = Object.defineProperty;
var State_defNormalProp = (obj, key, value) => key in obj ? State_defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var State_publicField = (obj, key, value) => {
  State_defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};





class State extends EventEmitter {
  constructor(args) {
    super();
    State_publicField(this, "_slices");
    State_publicField(this, "_activeSlice");
    State_publicField(this, "_message");
    State_publicField(this, "_mouse");
    State_publicField(this, "_setActiveSlice", () => {
      if (this.slices.length === 0) {
        this.activeSlice = null;
        return;
      }
      const $sliceZone = getSliceZoneDOM(this.slices.length);
      if (!$sliceZone) {
        this.activeSlice = null;
        return;
      }
      const $activeSlice = getActiveSliceDOM($sliceZone, this._mouse);
      if (!$activeSlice) {
        this.activeSlice = null;
        return;
      }
      const activeSliceIndex = Array.prototype.indexOf.call($sliceZone.children, $activeSlice);
      this.activeSlice = {
        rect: $activeSlice.getBoundingClientRect(),
        sliceID: this.slices[activeSliceIndex].slice_type,
        variationID: this.slices[activeSliceIndex].variation,
        index: activeSliceIndex
      };
    });
    State_publicField(this, "setActiveSlice", throttle(this._setActiveSlice, 16));
    this._slices = (args == null ? void 0 : args.slices) || getDefaultSlices();
    this._activeSlice = null;
    this._message = "";
    this._mouse = { x: 0, y: 0 };
  }
  set slices(slices) {
    this._slices = slices;
    this.message = "";
    this.emit(StateEventType.Slices, slices);
  }
  get slices() {
    return this._slices;
  }
  set activeSlice(activeSlice) {
    this._activeSlice = activeSlice;
    this.emit(StateEventType.ActiveSlice, activeSlice);
  }
  get activeSlice() {
    return this._activeSlice;
  }
  set message(message) {
    this._message = message;
    this.emit(StateEventType.Message, message);
  }
  get message() {
    return this._message;
  }
  async init() {
    window.addEventListener("mousemove", (event) => {
      this._mouse = { x: event.clientX, y: event.clientY };
    });
  }
  setSliceZone(slices) {
    this.slices = slices;
  }
}

//# sourceMappingURL=State.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/kit/messages.js
const div = (content) => `<div style="word-spacing: initial; white-space: pre; line-height: initial; font-family: monospace; color: #ffffff; mix-blend-mode: difference; padding: 1rem; font-size: 1rem;">${content}</div>`;
const a = (href, label) => `<a href="${href}" style="text-decoration: underline;">${label || href}<a>`;
const header = "   _____ ___          _____ _                 __      __            \n  / ___// (_)_______ / ___/(_)___ ___  __  __/ /___ _/ /_____  _____\n  \\__ \\/ / / ___/ _ \\\\__ \\/ / __ `__ \\/ / / / / __ `/ __/ __ \\/ ___/\n ___/ / / / /__/  __/__/ / / / / / / / /_/ / / /_/ / /_/ /_/ / /    \n/____/_/_/\\___/\\___/____/_/_/ /_/ /_/\\__,_/_/\\__,_/\\__/\\____/_/     \n                  / /_  __  __   / __ \\_____(_)________ ___  (_)____\n                 / __ \\/ / / /  / /_/ / ___/ / ___/ __ `__ \\/ / ___/\n                / /_/ / /_/ /  / ____/ /  / (__  ) / / / / / / /__  \n               /_.___/\\__, /  /_/   /_/  /_/____/_/ /_/ /_/_/\\___/  \n                     /____/\n\n";
const footer = "\n\n\n\n\n\n                                                - The Prismic team";
const sliceSimulatorAccessedDirectly = div([
  header,
  `You're seeing this page because you're accessing Slice simulator
directly, e.g:

  - ${a("http://localhost:3000/slice-simulator")}



The Slice simulator can only be accessed through Slice Machine or the
Page Builder. To preview your Slices, head over to Slice Machine:

  - ${a("http://localhost:9999")}



If you believe this is an error, please reach out to us:

  - ${a("https://github.com/prismicio/slice-machine/issues/new/choose")}`,
  footer
].join(""));

//# sourceMappingURL=messages.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/kit/SimulatorManager.js
var SimulatorManager_defProp = Object.defineProperty;
var SimulatorManager_defNormalProp = (obj, key, value) => key in obj ? SimulatorManager_defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var SimulatorManager_publicField = (obj, key, value) => {
  SimulatorManager_defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};










class SimulatorManager {
  constructor(args) {
    SimulatorManager_publicField(this, "state");
    SimulatorManager_publicField(this, "_api");
    SimulatorManager_publicField(this, "_initialized");
    this.state = new State(args);
    this._api = null;
    this._initialized = false;
  }
  async init() {
    if (this._initialized) {
      return;
    } else {
      this._initialized = true;
    }
    await this.state.init();
    try {
      await this._initAPI();
    } catch (error) {
      if (error instanceof Error && error.message === "Receiver is currently not embedded as an iframe" && !this.state.slices.length) {
        this.state.message = sliceSimulatorAccessedDirectly;
      }
      console.error(error);
      return;
    }
    this._initListeners();
  }
  async _initAPI() {
    this._api = new SimulatorAPI({
      [ClientRequestType.SetSliceZone]: (req, res) => {
        this.state.setSliceZone(req.data);
        return res.success();
      },
      [ClientRequestType.ScrollToSlice]: (req, res) => {
        var _a;
        if (req.data.sliceIndex < 0) {
          return res.error("`sliceIndex` must be > 0", 400);
        } else if (req.data.sliceIndex >= this.state.slices.length) {
          return res.error(`\`sliceIndex\` must be < ${this.state.slices.length} (\`<SliceZone />\` current length)`, 400);
        }
        const $sliceZone = getSliceZoneDOM(this.state.slices.length);
        if (!$sliceZone) {
          return res.error("Failed to find `<SliceZone />`", 500);
        }
        this.state.activeSlice = null;
        const $slice = $sliceZone.children[req.data.sliceIndex];
        if (!$slice) {
          return res.error(`Failed fo find slice at index $\`{req.data.sliceIndex}\` in \`<SliceZone />\``, 500);
        }
        $slice.scrollIntoView({
          behavior: req.data.behavior,
          block: req.data.block,
          inline: req.data.inline
        });
        ((_a = this._api) == null ? void 0 : _a.options.activeSliceAPI) && setTimeout(this.state.setActiveSlice, 750);
        return res.success();
      }
    });
    await this._api.ready();
  }
  _initListeners() {
    var _a, _b;
    if ((_a = this._api) == null ? void 0 : _a.options.activeSliceAPI) {
      window.addEventListener("mousemove", () => {
        this.state.setActiveSlice();
      });
      window.addEventListener("resize", () => {
        this.state.setActiveSlice();
      });
      window.addEventListener("mousewheel", () => {
        setTimeout(this.state.setActiveSlice, 200);
      });
      this.state.on(StateEventType.Slices, () => {
        this.state.setActiveSlice();
      });
      this.state.on(StateEventType.ActiveSlice, async (activeSlice) => {
        if (this._api) {
          try {
            await this._api.setActiveSlice(activeSlice);
          } catch (error) {
            if (error instanceof ResponseError && error.response.status === 400) {
              console.error(error.response);
            } else {
              throw error;
            }
          }
        }
      });
    }
    if ((_b = this._api) == null ? void 0 : _b.options.sliceZoneSizeAPI) {
      const resizeObserver = new ResizeObserver(throttle(async (entries) => {
        const [entry] = entries;
        if (this._api && entry) {
          try {
            await this._api.setSliceZoneSize({ rect: entry.contentRect });
          } catch (error) {
            if (error instanceof ResponseError && error.response.status === 400) {
              console.error(error.response);
            } else {
              throw error;
            }
          }
        }
      }, 16));
      const observeSimulatorRoot = () => {
        const simulatorRootDOM = getSimulatorRootDOM();
        resizeObserver.disconnect();
        if (simulatorRootDOM) {
          resizeObserver.observe(simulatorRootDOM);
        }
      };
      const mutationObserver = new MutationObserver(observeSimulatorRoot);
      mutationObserver.observe(getSimulatorDOM(), {
        subtree: false,
        childList: true
      });
    }
  }
}

//# sourceMappingURL=SimulatorManager.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/kit/eventHandlers.js
const disableEventHandler = (event) => {
  event.preventDefault();
  event.stopPropagation();
};
const onClickHandler = (event) => {
  if (event.path && event.path.slice(0, 5).some((el) => el instanceof HTMLAnchorElement)) {
    event.preventDefault();
    event.stopPropagation();
  }
};

//# sourceMappingURL=eventHandlers.js.map

;// CONCATENATED MODULE: ./node_modules/@prismicio/simulator/dist/kit.js








//# sourceMappingURL=kit.js.map

;// CONCATENATED MODULE: ./node_modules/@slicemachine/adapter-next/dist/simulator/SliceSimulator.js
'use client';
'use client';



const simulatorManager = new SimulatorManager();
const SliceSimulator = ({ sliceZone: SliceZoneComp, background, zIndex, className }) => {
  const defaultProps = getDefaultProps();
  const [slices, setSlices] = react_.useState(() => getDefaultSlices());
  const [message, setMessage] = react_.useState(() => getDefaultMessage());
  react_.useEffect(() => {
    simulatorManager.state.on(StateEventType.Slices, (_slices) => {
      setSlices(_slices);
    }, "simulator-slices");
    simulatorManager.state.on(StateEventType.Message, (_message) => {
      setMessage(_message);
    }, "simulator-message");
    simulatorManager.init();
    return () => {
      simulatorManager.state.off(StateEventType.Slices, "simulator-slices");
      simulatorManager.state.off(StateEventType.Message, "simulator-message");
    };
  }, []);
  return (0,jsx_runtime_.jsx)("div", { className: [simulatorClass, className].filter(Boolean).join(" "), style: {
    zIndex: typeof zIndex === "undefined" ? defaultProps.zIndex : zIndex ?? void 0,
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    overflow: "auto",
    background: typeof background === "undefined" ? defaultProps.background : background ?? void 0
  }, children: message ? (0,jsx_runtime_.jsx)("article", { dangerouslySetInnerHTML: { __html: message } }) : slices.length ? (0,jsx_runtime_.jsx)("div", { id: "root", className: simulatorRootClass, onClickCapture: onClickHandler, onSubmitCapture: disableEventHandler, children: (0,jsx_runtime_.jsx)(SliceZoneComp, { slices }) }) : null });
};

//# sourceMappingURL=SliceSimulator.js.map

;// CONCATENATED MODULE: ./node_modules/@slicemachine/adapter-next/dist/simulator.js


//# sourceMappingURL=simulator.js.map


/***/ }),

/***/ 2359:
/***/ ((module) => {

module.exports = JSON.parse('{"100":"Continue","101":"Switching Protocols","102":"Processing","103":"Early Hints","200":"OK","201":"Created","202":"Accepted","203":"Non-Authoritative Information","204":"No Content","205":"Reset Content","206":"Partial Content","207":"Multi-Status","208":"Already Reported","226":"IM Used","300":"Multiple Choices","301":"Moved Permanently","302":"Found","303":"See Other","304":"Not Modified","305":"Use Proxy","307":"Temporary Redirect","308":"Permanent Redirect","400":"Bad Request","401":"Unauthorized","402":"Payment Required","403":"Forbidden","404":"Not Found","405":"Method Not Allowed","406":"Not Acceptable","407":"Proxy Authentication Required","408":"Request Timeout","409":"Conflict","410":"Gone","411":"Length Required","412":"Precondition Failed","413":"Payload Too Large","414":"URI Too Long","415":"Unsupported Media Type","416":"Range Not Satisfiable","417":"Expectation Failed","418":"I\'m a Teapot","421":"Misdirected Request","422":"Unprocessable Entity","423":"Locked","424":"Failed Dependency","425":"Too Early","426":"Upgrade Required","428":"Precondition Required","429":"Too Many Requests","431":"Request Header Fields Too Large","451":"Unavailable For Legal Reasons","500":"Internal Server Error","501":"Not Implemented","502":"Bad Gateway","503":"Service Unavailable","504":"Gateway Timeout","505":"HTTP Version Not Supported","506":"Variant Also Negotiates","507":"Insufficient Storage","508":"Loop Detected","509":"Bandwidth Limit Exceeded","510":"Not Extended","511":"Network Authentication Required"}');

/***/ })

};
;