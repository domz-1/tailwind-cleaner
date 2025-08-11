'use strict';

var common_js = require('./common.js');

function s(t,r="Invalid RGB color"){return console.warn(r),[t[0]??0,t[1]??0,t[2]]}function c(t){const r=common_js.cleanDefinition(t),n=common_js.splitValues(r);return n.length!==3&&n.length!==4?s(n,`Too few values to define rgb: ${t} -> ${r}`):[n[0],n[1],n[2]]}function f(t){return {r:common_js.limitValue(Math.round(common_js.convertToInt8(t[0])),0,255)||0,g:common_js.limitValue(Math.round(common_js.convertToInt8(t[1])),0,255)||0,b:common_js.limitValue(Math.round(common_js.convertToInt8(t[2])),0,255)||0}}function g(t){return `rgb(${t.r},${t.g},${t.b})`}

exports.RGB = g;
exports.fallbackRGB = s;
exports.getRgbValues = f;
exports.parseRgb = c;
