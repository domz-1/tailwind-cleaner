import { fallbackRGB } from './rgb-utils.js';

function a(t){return Array.from(t).map(n=>(n+n).toUpperCase())}function p(t){return !!t.match(/^[0-9a-f]+$/i)}function c(t){const n=t.substring(1);let e=[];return n&&(n.length===3||n.length===4?e=a(n):(n.length===6||n.length===8)&&(e=(n.match(/../g)||[]).map(r=>r))),e.length?(e==null||e.forEach((r,i)=>{p(r)?e[i]=r.toUpperCase():console.warn(`Invalid Hex value: ${r}`);}),e):(console.warn(`Invalid Hex: ${t}`),fallbackRGB(e))}function m(t){return {r:Number.parseInt(t[0],16),g:Number.parseInt(t[1],16),b:Number.parseInt(t[2],16)}}function o(t){return t.toString(16).padStart(2,"0")}function x(t){return `#${o(t==null?void 0:t.r)}${o(t==null?void 0:t.g)}${o(t==null?void 0:t.b)}`}

export { m as hexToRgb, p as isHex, c as parseHex, a as shortHexToLongHex, o as toHex, x as valuesToHex };
