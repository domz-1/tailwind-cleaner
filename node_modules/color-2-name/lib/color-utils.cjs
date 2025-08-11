'use strict';

var i = require('./data/colorSet.js');
var hexUtils_js = require('./hex-utils.js');
var hslUtils_js = require('./hsl-utils.js');
var rgbUtils_js = require('./rgb-utils.js');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var i__default = /*#__PURE__*/_interopDefault(i);

function R(r,f=i__default.default){const n=f.find(o=>o[3]===r);if(typeof n<"u"){const[o,t,e]=n;return {hex:hexUtils_js.valuesToHex({r:o,g:t,b:e}),rgb:rgbUtils_js.RGB({r:o,g:t,b:e}),hsl:hslUtils_js.valuesToHsl({r:o,g:t,b:e})}}throw new Error(`Error: invalid color ${r} or empty colorSet`)}function c(){return i__default.default.map(r=>({name:r[3],...R(r[3])}))}

exports.getColor = R;
exports.getColors = c;
