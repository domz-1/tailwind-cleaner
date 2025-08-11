import { cleanDefinition, splitValues, limitValue, convertToInt8 } from './common.js';

function s(t,r="Invalid RGB color"){return console.warn(r),[t[0]??0,t[1]??0,t[2]]}function f(t){const r=cleanDefinition(t),n=splitValues(r);return n.length!==3&&n.length!==4?s(n,`Too few values to define rgb: ${t} -> ${r}`):[n[0],n[1],n[2]]}function g(t){return {r:limitValue(Math.round(convertToInt8(t[0])),0,255)||0,g:limitValue(Math.round(convertToInt8(t[1])),0,255)||0,b:limitValue(Math.round(convertToInt8(t[2])),0,255)||0}}function p(t){return `rgb(${t.r},${t.g},${t.b})`}

export { p as RGB, s as fallbackRGB, g as getRgbValues, f as parseRgb };
