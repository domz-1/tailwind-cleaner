import i from './data/colorSet.js';
import { valuesToHex } from './hex-utils.js';
import { valuesToHsl } from './hsl-utils.js';
import { RGB } from './rgb-utils.js';

function R(r,f=i){const n=f.find(o=>o[3]===r);if(typeof n<"u"){const[o,t,e]=n;return {hex:valuesToHex({r:o,g:t,b:e}),rgb:RGB({r:o,g:t,b:e}),hsl:valuesToHsl({r:o,g:t,b:e})}}throw new Error(`Error: invalid color ${r} or empty colorSet`)}function g(){return i.map(r=>({name:r[3],...R(r[3])}))}

export { R as getColor, g as getColors };
