'use strict';

var common_js = require('./common.js');

function d(n,t="Invalid HSL color"){return console.warn(t),[n[0]??0,n[1]??0,n[2]]}function x(n){const t=common_js.cleanDefinition(n);let e=common_js.splitValues(t);return e.length!==3&&e.length!==4&&(e=d(e)),[e[0],e[1],e[2]]}const p=n=>`Invalid angle: ${n} - The none keyword is invalid in legacy color syntax `;function h(n){return {h:common_js.colorValueFallbacks(n[0],p(n[0]))||Math.round(common_js.normalizeDegrees(n[0]))||0,s:common_js.colorValueFallbacks(n[1])||common_js.convertToInt8(n[1],100)||0,l:common_js.colorValueFallbacks(n[2])||common_js.convertToInt8(n[2],100)||0}}function L(n,t,e){return e<60?[n,t,0]:e<120?[t,n,0]:e<180?[0,n,t]:e<240?[0,t,n]:e<300?[t,0,n]:[n,0,t]}function v(n){const t=h(n),e=t.s/100,l=t.l/100,i=(1-Math.abs(2*l-1))*e,s=i*(1-Math.abs(t.h/60%2-1)),r=l-i/2;let[u,o,a]=L(i,s,t.h);return u=Math.round((u+r)*255),o=Math.round((o+r)*255),a=Math.round((a+r)*255),{r:u,g:o,b:a}}function E({r:n,g:t,b:e}){n/=255,t/=255,e/=255;const l=Math.min(n,t,e),i=Math.max(n,t,e),s=i-l;let r=0,u=0,o=0;return s===0?r=0:i===n?r=(t-e)/s%6:i===t?r=(e-n)/s+2:r=(n-t)/s+4,r=Math.round(r*60),r<0&&(r+=360),o=(i+l)/2,u=s===0?0:s/(1-Math.abs(2*o-1)),u=+(u*100).toFixed(1),o=+(o*100).toFixed(1),M({h:r,s:u,l:o})}function M(n){return `hsl(${n.h},${n.s}%,${n.l}%)`}

exports.HSL = M;
exports.fallbackHSL = d;
exports.getHslValues = h;
exports.hslToRgb = v;
exports.parseHsl = x;
exports.valuesToHsl = E;
