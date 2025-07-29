/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "react/jsx-runtime":
/*!**********************************!*\
  !*** external "ReactJSXRuntime" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = window["ReactJSXRuntime"];

/***/ }),

/***/ "@wordpress/block-editor":
/*!*************************************!*\
  !*** external ["wp","blockEditor"] ***!
  \*************************************/
/***/ ((module) => {

"use strict";
module.exports = window["wp"]["blockEditor"];

/***/ }),

/***/ "@wordpress/blocks":
/*!********************************!*\
  !*** external ["wp","blocks"] ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = window["wp"]["blocks"];

/***/ }),

/***/ "@wordpress/components":
/*!************************************!*\
  !*** external ["wp","components"] ***!
  \************************************/
/***/ ((module) => {

"use strict";
module.exports = window["wp"]["components"];

/***/ }),

/***/ "@wordpress/data":
/*!******************************!*\
  !*** external ["wp","data"] ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = window["wp"]["data"];

/***/ }),

/***/ "@wordpress/element":
/*!*********************************!*\
  !*** external ["wp","element"] ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = window["wp"]["element"];

/***/ }),

/***/ "@wordpress/i18n":
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = window["wp"]["i18n"];

/***/ }),

/***/ "./node_modules/classnames/index.js":
/*!******************************************!*\
  !*** ./node_modules/classnames/index.js ***!
  \******************************************/
/***/ ((module, exports) => {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
	Copyright (c) 2018 Jed Watson.
	Licensed under the MIT License (MIT), see
	http://jedwatson.github.io/classnames
*/
/* global define */

(function () {
	'use strict';

	var hasOwn = {}.hasOwnProperty;

	function classNames () {
		var classes = '';

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (arg) {
				classes = appendClass(classes, parseValue(arg));
			}
		}

		return classes;
	}

	function parseValue (arg) {
		if (typeof arg === 'string' || typeof arg === 'number') {
			return arg;
		}

		if (typeof arg !== 'object') {
			return '';
		}

		if (Array.isArray(arg)) {
			return classNames.apply(null, arg);
		}

		if (arg.toString !== Object.prototype.toString && !arg.toString.toString().includes('[native code]')) {
			return arg.toString();
		}

		var classes = '';

		for (var key in arg) {
			if (hasOwn.call(arg, key) && arg[key]) {
				classes = appendClass(classes, key);
			}
		}

		return classes;
	}

	function appendClass (value, newClass) {
		if (!newClass) {
			return value;
		}
	
		if (value) {
			return value + ' ' + newClass;
		}
	
		return value + newClass;
	}

	if ( true && module.exports) {
		classNames.default = classNames;
		module.exports = classNames;
	} else if (true) {
		// register as 'classnames', consistent with npm package name
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function () {
			return classNames;
		}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else {}
}());


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
/*!**************************************!*\
  !*** ./ar-blocks/ar-try-on/index.js ***!
  \**************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/blocks */ "@wordpress/blocks");
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/data */ "@wordpress/data");
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_data__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/block-editor */ "@wordpress/block-editor");
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var classnames__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! classnames */ "./node_modules/classnames/index.js");
/* harmony import */ var classnames__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(classnames__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__);








(0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__.registerBlockType)('atlas-ar/ar-try-on', {
  icon: 'universal-access',
  edit: ({
    clientId,
    attributes,
    setAttributes
  }) => {
    const {
      glb,
      hdr,
      poster,
      shadowIntensity,
      autoRotate,
      cameraOrbit,
      zoom,
      tap,
      skyBox,
      blockClass,
      alignmentDesktop,
      alignmentTablet,
      alignmentMobile,
      widthDesktop,
      widthTablet,
      widthMobile,
      heightDesktop,
      heightTablet,
      heightMobile,
      blockStyle,
      posterType,
      hdrType,
      glbType,
      skyBoxType
    } = attributes;
    const {
      device
    } = (0,_wordpress_data__WEBPACK_IMPORTED_MODULE_3__.useSelect)(select => {
      const {
        getDeviceType
      } = select('core/editor');
      return {
        device: getDeviceType()
      };
    }, []);
    const {
      setDeviceType
    } = (0,_wordpress_data__WEBPACK_IMPORTED_MODULE_3__.dispatch)('core/editor');
    const blockProps = (0,_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__.useBlockProps)({
      className: classnames__WEBPACK_IMPORTED_MODULE_6___default()('bdt-atlas-ar', blockClass)
    });
    const prevAttr = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useRef)(attributes);
    (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
      const rand = clientId?.slice(-6);
      if (!blockClass) {
        setAttributes({
          blockClass: `atlas-ar${rand}`
        });
      }
      if (blockClass && JSON.stringify(attributes) !== JSON.stringify(prevAttr.current)) {
        setAttributes({
          blockClass: `atlas-ar${rand}`
        });
        prevAttr.current = attributes;
      }
    }, [clientId, JSON.stringify(attributes)]);
    (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.useEffect)(() => {
      const styles = a => {
        const b = a?.blockClass;
        return `
                    .${b}{
                        --atlas-ar-align-desktop: ${alignmentDesktop};
                        --atlas-ar-align-tablet: ${alignmentTablet};
                        --atlas-ar-align-mobile: ${alignmentMobile};
                        --atlas-ar-width-desktop: ${widthDesktop}px;
                        --atlas-ar-width-tablet: ${widthTablet}px;
                        --atlas-ar-width-mobile: ${widthMobile}px;
                        --atlas-ar-height-desktop: ${heightDesktop}px;
                        --atlas-ar-height-tablet: ${heightTablet}px;
                        --atlas-ar-height-mobile: ${heightMobile}px;
                    }
                `;
      };
      setAttributes({
        blockStyle: styles(attributes)
      });
    }, [JSON.stringify(attributes), clientId]);
    const modelViewerAttrs = {
      src: glb,
      'environment-image': hdr,
      poster,
      'shadow-intensity': shadowIntensity || 1,
      'camera-controls': '',
      'touch-action': 'pan-y',
      'tone-mapping': 'neutral',
      'auto-rotate': autoRotate ? '' : undefined,
      'camera-orbit': cameraOrbit,
      'disable-zoom': zoom,
      'disable-tap': tap,
      'skybox-image': skyBox
    };
    const ResponsiveWrapper = ({
      children
    }) => {
      let icon = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("svg", {
        viewBox: "0 0 24 24",
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("path", {
          d: "M20.5 16h-.7V8c0-1.1-.9-2-2-2H6.2c-1.1 0-2 .9-2 2v8h-.7c-.8 0-1.5.7-1.5 1.5h20c0-.8-.7-1.5-1.5-1.5zM5.7 8c0-.3.2-.5.5-.5h11.6c.3 0 .5.2.5.5v7.6H5.7V8z"
        })
      });
      if (device === 'Tablet') {
        icon = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("svg", {
          viewBox: "0 0 24 24",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("path", {
            d: "M17 4H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H7c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h10c.3 0 .5.2.5.5v12zm-7.5-.5h4V16h-4v1.5z"
          })
        });
      }
      if (device === 'Mobile') {
        icon = /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("svg", {
          viewBox: "0 0 24 24",
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("path", {
            d: "M15 4H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H9c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h6c.3 0 .5.2.5.5v12zm-4.5-.5h2V16h-2v1.5z"
          })
        });
      }
      return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)("div", {
        className: "atlas-ar-blocks-responsive",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.DropdownMenu, {
          icon: icon,
          controls: [{
            icon,
            onClick: () => setDeviceType('Desktop')
          }, {
            icon,
            onClick: () => setDeviceType('Tablet')
          }, {
            icon,
            onClick: () => setDeviceType('Mobile')
          }]
        }), children]
      });
    };
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__.InspectorControls, {
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.TabPanel, {
          tabs: [{
            name: 'content',
            title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Content', 'atlas-ar')
          }, {
            name: 'style',
            title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Style', 'atlas-ar')
          }],
          children: tab => {
            switch (tab.name) {
              case 'content':
                return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.PanelBody, {
                    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Content')
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.PanelBody, {
                    title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Camera Settings', 'atlas-ar'),
                    initialOpen: false,
                    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.ToggleControl, {
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Auto Rotate', 'atlas-ar'),
                      checked: autoRotate,
                      onChange: v => setAttributes({
                        autoRotate: v
                      })
                    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.TextControl, {
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Shadow Intensity', 'atlas-ar'),
                      value: shadowIntensity,
                      onChange: v => setAttributes({
                        shadowIntensity: v
                      })
                    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.TextControl, {
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Camera Orbit', 'atlas-ar'),
                      value: cameraOrbit,
                      placeholder: "45deg 55deg 4m",
                      onChange: v => setAttributes({
                        cameraOrbit: v
                      })
                    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.ToggleControl, {
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Disable Zoom', 'atlas-ar'),
                      checked: zoom,
                      onChange: v => setAttributes({
                        zoom: v
                      })
                    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.ToggleControl, {
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Disable Tap', 'atlas-ar'),
                      checked: tap,
                      onChange: v => setAttributes({
                        tap: v
                      })
                    })]
                  })]
                });
              case 'style':
                return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.PanelBody, {
                  title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Canvas', 'atlas-ar'),
                  children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(ResponsiveWrapper, {
                    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.__experimentalToggleGroupControl, {
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Alignment', 'atlas-ar'),
                      value: attributes[`alignment${device}`],
                      isBlock: true,
                      isDeselectable: true,
                      onChange: v => setAttributes({
                        [`alignment${device}`]: v
                      }),
                      children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.__experimentalToggleGroupControlOption, {
                        value: "left",
                        label: "L"
                      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.__experimentalToggleGroupControlOption, {
                        value: "center",
                        label: "C"
                      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.__experimentalToggleGroupControlOption, {
                        value: "right",
                        label: "R"
                      })]
                    })
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(ResponsiveWrapper, {
                    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.RangeControl, {
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Width (px)', 'atlas-ar'),
                      value: attributes[`width${device}`],
                      onChange: v => setAttributes({
                        [`width${device}`]: v
                      }),
                      min: 100,
                      max: 1000
                    })
                  }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(ResponsiveWrapper, {
                    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_5__.RangeControl, {
                      label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_1__.__)('Height (px)', 'atlas-ar'),
                      value: attributes[`height${device}`],
                      onChange: v => setAttributes({
                        [`height${device}`]: v
                      }),
                      min: 100,
                      max: 1000
                    })
                  })]
                });
            }
          }
        })
      }), blockStyle && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("style", {
        children: blockStyle
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        ...blockProps,
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("model-viewer", {
          ar: true,
          ...modelViewerAttrs
        })
      })]
    });
  },
  save: ({
    attributes
  }) => {
    const blockProps = _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_4__.useBlockProps.save({
      className: classnames__WEBPACK_IMPORTED_MODULE_6___default()('bdt-atlas-ar', attributes?.blockClass)
    });
    const outputAttrs = {
      src: attributes?.glb,
      'environment-image': attributes?.hdr,
      poster: attributes?.poster,
      'shadow-intensity': attributes?.shadowIntensity || 1,
      'camera-controls': '',
      'touch-action': 'pan-y',
      'tone-mapping': 'neutral',
      'auto-rotate': attributes?.autoRotate ? '' : undefined,
      'camera-orbit': attributes?.cameraOrbit,
      'disable-zoom': attributes?.zoom,
      'disable-tap': attributes?.tap,
      'skybox-image': attributes?.skyBox
    };
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsxs)(_wordpress_element__WEBPACK_IMPORTED_MODULE_2__.Fragment, {
      children: [attributes?.blockStyle && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("style", {
        children: attributes?.blockStyle
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("div", {
        ...blockProps,
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_7__.jsx)("model-viewer", {
          ar: true,
          ...outputAttrs
        })
      })]
    });
  }
});
})();

/******/ })()
;
//# sourceMappingURL=index.js.map