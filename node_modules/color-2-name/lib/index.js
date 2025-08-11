import { getColor } from './color-utils.js';
export { getColor, getColors } from './color-utils.js';
import { hexRegex, rgbRegex, hslRegex, BLACKANDWHITE, RGBSET } from './common.js';
import L from './data/colorSet.js';
import { parseHex, hexToRgb, valuesToHex } from './hex-utils.js';
import { parseHsl, hslToRgb } from './hsl-utils.js';
import { parseRgb, getRgbValues } from './rgb-utils.js';

const d=[{regex:hexRegex,parser:parseHex,converter:hexToRgb},{regex:rgbRegex,parser:parseRgb,converter:getRgbValues},{regex:hslRegex,parser:parseHsl,converter:hslToRgb}];function c(r,e=L,n){let s=Number.MAX_SAFE_INTEGER;const t={name:"error",color:"#F00"};if(e.length<1)return t;const l=Object.values(v(r)),a=e.length,b=e.map(o=>[o[0],o[1],o[2]]);for(let o=0;o<a;o++){const E=b[o],i=g(l,E,!0);if(i<s&&(s=i,t.name=e[o][3],t.color=`rgb(${e[o][0]},${e[o][1]},${e[o][2]})`),i===0)break}return n!=null&&n.info?{...getColor(t.name,e),...t,gap:Math.sqrt(s)}:t}function v(r){for(const{regex:e,parser:n,converter:s}of d)if(e.test(r)){const t=n(r);return s(t)}throw new Error(`Invalid color: ${r}`)}function V(r){return c(r,BLACKANDWHITE).name==="white"}function H(r){return c(r,BLACKANDWHITE).name==="black"}function I(r){return c(r,RGBSET).name}function g(r,e,n=!1){const[s,t,l]=[e[0]-r[0],e[1]-r[1],e[2]-r[2]],a=s*s+t*t+l*l;return n?a:Math.sqrt(a)}function A(r){if(rgbRegex.test(r)){const e=parseRgb(r),n=getRgbValues(e);return valuesToHex(n)}throw new Error(`Invalid color: ${r}`)}

export { c as closest, I as closestRGB, d as colorParsers, g as distance, H as isDark, V as isLight, v as parseColor, A as rgbToHex };
