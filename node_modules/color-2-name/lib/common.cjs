'use strict';

const h=441.6729559300637,g=/^#([\da-f]{3,8})/i,b=/^rgba?\(([^)]+)\)/i,m=/^hsla?\(([^)]+)\)/i,s=/^-?\d*\.?\d+$/i,o=/(\/\*[^*]*\*\/)|(\/\/[^*]*)/g,d=[[255,255,255,"white"],[1,1,1,"black"]],l=[[255,0,0,"red"],[0,255,0,"green"],[0,0,255,"blue"]];function R(t){return t.split(t.includes(",")?",":" ").map(n=>n.trim())}function c(t){let n=Number.parseFloat(t)||0;for(t.indexOf("deg")>-1?n=Number.parseFloat(t.substring(0,t.length-3)):t.indexOf("rad")>-1?n=Math.round(Number.parseFloat(t.substring(0,t.length-3))*(180/Math.PI)):t.indexOf("turn")>-1&&(n=Math.round(Number.parseFloat(t.substring(0,t.length-4))*360));n<0;)n+=360;return n>=360&&(n%=360),n}function i(t,n=0,e=0){return Math.min(Math.max(Math.round(t),n),e)}function a(t,n){const e=/calc\(([^)]+)\)/,r=t.match(e);return p(r?r[1]:t,n)}function N(t){const n=t.replace(o,""),e=n.indexOf("("),r=n.lastIndexOf(")");return n.slice(e+1,r).trim()}function u(t,n){return Number.parseFloat(t)/100*n}function f(t,n){return t==="infinity"?(console.warn(n||`Positive infinity value has been set to 255: ${t}`),255):(t==="currentColor"&&console.warn(n||`The "currentColor" value has been set to 0: ${t}`),t==="transparent"&&console.warn(n||`The "transparent" value has been set to 0: ${t}`),t==="NaN"&&console.warn(n||`"NaN" value has been set to 0: ${t}`),t==="-infinity"&&console.warn(n||`"Negative" infinity value has been set to 0: ${t}`),t==="none"&&console.warn(n||`The none keyword is invalid in legacy color syntax: ${t}`),0)}function p(t,n=255){const e=typeof t=="string"?t==null?void 0:t.trim():"0";return s.test(e)?i(Number.parseFloat(e)||0,0,n):e.endsWith("%")?u(e,n)||0:e.endsWith("deg")||e.endsWith("rad")||e.endsWith("turn")?c(e):e.startsWith("calc")?i(a(e,n),0,n):f(e,`Invalid value: ${t}`)}

exports.BLACKANDWHITE = d;
exports.MAXDISTANCE = h;
exports.RGBSET = l;
exports.calculateValue = a;
exports.cleanDefinition = N;
exports.colorValueFallbacks = f;
exports.convertToInt8 = p;
exports.hexRegex = g;
exports.hslRegex = m;
exports.isNumeric = s;
exports.limitValue = i;
exports.normalizeDegrees = c;
exports.normalizePercentage = u;
exports.rgbRegex = b;
exports.splitValues = R;
exports.stripComments = o;
