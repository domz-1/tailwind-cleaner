'use strict';

var colorUtils_js = require('./color-utils.js');
var common_js = require('./common.js');
var L = require('./data/colorSet.js');
var hexUtils_js = require('./hex-utils.js');
var hslUtils_js = require('./hsl-utils.js');
var rgbUtils_js = require('./rgb-utils.js');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var L__default = /*#__PURE__*/_interopDefault(L);

const d=[{regex:common_js.hexRegex,parser:hexUtils_js.parseHex,converter:hexUtils_js.hexToRgb},{regex:common_js.rgbRegex,parser:rgbUtils_js.parseRgb,converter:rgbUtils_js.getRgbValues},{regex:common_js.hslRegex,parser:hslUtils_js.parseHsl,converter:hslUtils_js.hslToRgb}];function c(r,e=L__default.default,n){let s=Number.MAX_SAFE_INTEGER;const t={name:"error",color:"#F00"};if(e.length<1)return t;const l=Object.values(v(r)),a=e.length,b=e.map(o=>[o[0],o[1],o[2]]);for(let o=0;o<a;o++){const E=b[o],i=g(l,E,!0);if(i<s&&(s=i,t.name=e[o][3],t.color=`rgb(${e[o][0]},${e[o][1]},${e[o][2]})`),i===0)break}return n!=null&&n.info?{...colorUtils_js.getColor(t.name,e),...t,gap:Math.sqrt(s)}:t}function v(r){for(const{regex:e,parser:n,converter:s}of d)if(e.test(r)){const t=n(r);return s(t)}throw new Error(`Invalid color: ${r}`)}function V(r){return c(r,common_js.BLACKANDWHITE).name==="white"}function H(r){return c(r,common_js.BLACKANDWHITE).name==="black"}function I(r){return c(r,common_js.RGBSET).name}function g(r,e,n=!1){const[s,t,l]=[e[0]-r[0],e[1]-r[1],e[2]-r[2]],a=s*s+t*t+l*l;return n?a:Math.sqrt(a)}function A(r){if(common_js.rgbRegex.test(r)){const e=rgbUtils_js.parseRgb(r),n=rgbUtils_js.getRgbValues(e);return hexUtils_js.valuesToHex(n)}throw new Error(`Invalid color: ${r}`)}

Object.defineProperty(exports, "getColor", {
	enumerable: true,
	get: function () { return colorUtils_js.getColor; }
});
Object.defineProperty(exports, "getColors", {
	enumerable: true,
	get: function () { return colorUtils_js.getColors; }
});
exports.closest = c;
exports.closestRGB = I;
exports.colorParsers = d;
exports.distance = g;
exports.isDark = H;
exports.isLight = V;
exports.parseColor = v;
exports.rgbToHex = A;
