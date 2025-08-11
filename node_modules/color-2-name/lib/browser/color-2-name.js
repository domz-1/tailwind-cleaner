"use strict";
var color2name = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    closest: () => closest,
    closestRGB: () => closestRGB,
    colorParsers: () => colorParsers,
    distance: () => distance,
    getColor: () => getColor,
    getColors: () => getColors,
    isDark: () => isDark,
    isLight: () => isLight,
    parseColor: () => parseColor,
    rgbToHex: () => rgbToHex
  });

  // src/data/colorSet.ts
  var colorSet = [
    [255, 255, 255, "white"],
    [0, 0, 0, "black"],
    [255, 0, 0, "red"],
    [0, 128, 0, "green"],
    [0, 0, 255, "blue"],
    [255, 165, 0, "orange"],
    [128, 128, 128, "grey"],
    [255, 255, 0, "yellow"],
    [255, 0, 255, "magenta"],
    [154, 205, 50, "yellowgreen"],
    [192, 192, 192, "silver"],
    [0, 255, 0, "lime"],
    [128, 0, 128, "purple"],
    [255, 99, 71, "tomato"],
    [64, 224, 208, "turquoise"],
    [255, 127, 80, "coral"],
    [0, 255, 255, "cyan"],
    [255, 250, 240, "floralwhite"],
    [255, 192, 203, "pink"],
    [34, 139, 34, "forestgreen"],
    [245, 245, 220, "beige"],
    [255, 0, 255, "fuchsia"],
    [220, 220, 220, "gainsboro"],
    [248, 248, 255, "ghostwhite"],
    [255, 215, 0, "gold"],
    [218, 165, 32, "goldenrod"],
    [173, 255, 47, "greenyellow"],
    [238, 130, 238, "violet"],
    [245, 222, 179, "wheat"],
    [245, 245, 245, "whitesmoke"],
    [139, 0, 0, "darkred"],
    [240, 248, 255, "aliceblue"],
    [205, 92, 92, "indianred"],
    [75, 0, 130, "indigo"],
    [250, 235, 215, "antiquewhite"],
    [0, 255, 255, "aqua"],
    [127, 255, 212, "aquamarine"],
    [240, 255, 255, "azure"],
    [255, 228, 196, "bisque"],
    [255, 235, 205, "blanchedalmond"],
    [138, 43, 226, "blueviolet"],
    [165, 42, 42, "brown"],
    [222, 184, 135, "burlywood"],
    [95, 158, 160, "cadetblue"],
    [127, 255, 0, "chartreuse"],
    [210, 105, 30, "chocolate"],
    [100, 149, 237, "cornflowerblue"],
    [255, 248, 220, "cornsilk"],
    [220, 20, 60, "crimson"],
    [0, 0, 139, "darkblue"],
    [0, 139, 139, "darkcyan"],
    [184, 134, 11, "darkgoldenrod"],
    [169, 169, 169, "darkgrey"],
    [0, 100, 0, "darkgreen"],
    [189, 183, 107, "darkkhaki"],
    [139, 0, 139, "darkmagenta"],
    [85, 107, 47, "darkolivegreen"],
    [255, 140, 0, "darkorange"],
    [153, 50, 204, "darkorchid"],
    [233, 150, 122, "darksalmon"],
    [143, 188, 143, "darkseagreen"],
    [72, 61, 139, "darkslateblue"],
    [47, 79, 79, "darkslategrey"],
    [0, 206, 209, "darkturquoise"],
    [148, 0, 211, "darkviolet"],
    [255, 20, 147, "deeppink"],
    [0, 191, 255, "deepskyblue"],
    [105, 105, 105, "dimgrey"],
    [30, 144, 255, "dodgerblue"],
    [178, 34, 34, "firebrick"],
    [240, 255, 240, "honeydew"],
    [255, 105, 180, "hotpink"],
    [255, 255, 240, "ivory"],
    [240, 230, 140, "khaki"],
    [230, 230, 250, "lavender"],
    [255, 240, 245, "lavenderblush"],
    [124, 252, 0, "lawngreen"],
    [255, 250, 205, "lemonchiffon"],
    [173, 216, 230, "lightblue"],
    [240, 128, 128, "lightcoral"],
    [224, 255, 255, "lightcyan"],
    [250, 250, 210, "lightgoldenrodyellow"],
    [144, 238, 144, "lightgreen"],
    [211, 211, 211, "lightgrey"],
    [255, 182, 193, "lightpink"],
    [255, 160, 122, "lightsalmon"],
    [32, 178, 170, "lightseagreen"],
    [135, 206, 250, "lightskyblue"],
    [119, 136, 153, "lightslategrey"],
    [176, 196, 222, "lightsteelblue"],
    [255, 255, 224, "lightyellow"],
    [50, 205, 50, "limegreen"],
    [250, 240, 230, "linen"],
    [128, 0, 0, "maroon"],
    [102, 205, 170, "mediumaquamarine"],
    [0, 0, 205, "mediumblue"],
    [186, 85, 211, "mediumorchid"],
    [147, 112, 219, "mediumpurple"],
    [60, 179, 113, "mediumseagreen"],
    [123, 104, 238, "mediumslateblue"],
    [0, 250, 154, "mediumspringgreen"],
    [72, 209, 204, "mediumturquoise"],
    [199, 21, 133, "mediumvioletred"],
    [25, 25, 112, "midnightblue"],
    [245, 255, 250, "mintcream"],
    [255, 228, 225, "mistyrose"],
    [255, 228, 181, "moccasin"],
    [255, 222, 173, "navajowhite"],
    [0, 0, 128, "navy"],
    [253, 245, 230, "oldlace"],
    [128, 128, 0, "olive"],
    [107, 142, 35, "olivedrab"],
    [255, 69, 0, "orangered"],
    [218, 112, 214, "orchid"],
    [238, 232, 170, "palegoldenrod"],
    [152, 251, 152, "palegreen"],
    [175, 238, 238, "paleturquoise"],
    [219, 112, 147, "palevioletred"],
    [255, 239, 213, "papayawhip"],
    [255, 218, 185, "peachpuff"],
    [205, 133, 63, "peru"],
    [221, 160, 221, "plum"],
    [176, 224, 230, "powderblue"],
    [102, 51, 153, "rebeccapurple"],
    [188, 143, 143, "rosybrown"],
    [65, 105, 225, "royalblue"],
    [139, 69, 19, "saddlebrown"],
    [250, 128, 114, "salmon"],
    [244, 164, 96, "sandybrown"],
    [46, 139, 87, "seagreen"],
    [255, 245, 238, "seashell"],
    [160, 82, 45, "sienna"],
    [135, 206, 235, "skyblue"],
    [106, 90, 205, "slateblue"],
    [112, 128, 144, "slategrey"],
    [255, 250, 250, "snow"],
    [0, 255, 127, "springgreen"],
    [70, 130, 180, "steelblue"],
    [210, 180, 140, "tan"],
    [0, 128, 128, "teal"],
    [216, 191, 216, "thistle"]
  ];
  var colorSet_default = colorSet;

  // src/common.ts
  var hexRegex = /^#([\da-f]{3,8})/i;
  var rgbRegex = /^rgba?\(([^)]+)\)/i;
  var hslRegex = /^hsla?\(([^)]+)\)/i;
  var isNumeric = /^-?\d*\.?\d+$/i;
  var stripComments = /(\/\*[^*]*\*\/)|(\/\/[^*]*)/g;
  var BLACKANDWHITE = [
    [255, 255, 255, "white"],
    [1, 1, 1, "black"]
  ];
  var RGBSET = [
    [255, 0, 0, "red"],
    [0, 255, 0, "green"],
    [0, 0, 255, "blue"]
  ];
  function splitValues(rawValues) {
    return rawValues.split(rawValues.includes(",") ? "," : " ").map((s) => s.trim());
  }
  function normalizeDegrees(angle) {
    let degAngle = Number.parseFloat(angle) || 0;
    if (angle.indexOf("deg") > -1) {
      degAngle = Number.parseFloat(angle.substring(0, angle.length - 3));
    } else if (angle.indexOf("rad") > -1) {
      degAngle = Math.round(
        Number.parseFloat(angle.substring(0, angle.length - 3)) * (180 / Math.PI)
      );
    } else if (angle.indexOf("turn") > -1) {
      degAngle = Math.round(
        Number.parseFloat(angle.substring(0, angle.length - 4)) * 360
      );
    }
    while (degAngle < 0) {
      degAngle += 360;
    }
    if (degAngle >= 360) degAngle %= 360;
    return degAngle;
  }
  function limitValue(value, min = 0, max = 0) {
    return Math.min(Math.max(Math.round(value), min), max);
  }
  function calculateValue(valueString, multiplier) {
    const regex = /calc\(([^)]+)\)/;
    const match = valueString.match(regex);
    return convertToInt8(match ? match[1] : valueString, multiplier);
  }
  function cleanDefinition(string) {
    const cleanString = string.replace(stripComments, "");
    const firstParenthesisIndex = cleanString.indexOf("(");
    const lastParenthesisIndex = cleanString.lastIndexOf(")");
    return cleanString.slice(firstParenthesisIndex + 1, lastParenthesisIndex).trim();
  }
  function normalizePercentage(value, multiplier) {
    return Number.parseFloat(value) / 100 * multiplier;
  }
  function colorValueFallbacks(value, err) {
    if (value === "infinity") {
      console.warn(
        err || `Positive infinity value has been set to 255: ${value}`
      );
      return 255;
    }
    if (value === "currentColor")
      console.warn(err || `The "currentColor" value has been set to 0: ${value}`);
    if (value === "transparent")
      console.warn(err || `The "transparent" value has been set to 0: ${value}`);
    if (value === "NaN")
      console.warn(err || `"NaN" value has been set to 0: ${value}`);
    if (value === "-infinity")
      console.warn(
        err || `"Negative" infinity value has been set to 0: ${value}`
      );
    if (value === "none")
      console.warn(
        err || `The none keyword is invalid in legacy color syntax: ${value}`
      );
    return 0;
  }
  function convertToInt8(value, multiplier = 255) {
    const newValue = typeof value === "string" ? value?.trim() : "0";
    if (isNumeric.test(newValue)) {
      return limitValue(Number.parseFloat(newValue) || 0, 0, multiplier);
    }
    if (newValue.endsWith("%")) {
      return normalizePercentage(newValue, multiplier) || 0;
    }
    if (newValue.endsWith("deg") || newValue.endsWith("rad") || newValue.endsWith("turn")) {
      return normalizeDegrees(newValue);
    }
    if (newValue.startsWith("calc")) {
      return limitValue(calculateValue(newValue, multiplier), 0, multiplier);
    }
    return colorValueFallbacks(newValue, `Invalid value: ${value}`);
  }

  // src/rgb-utils.ts
  function fallbackRGB(rgb, err = "Invalid RGB color") {
    console.warn(err);
    return [rgb[0] ?? 0, rgb[1] ?? 0, rgb[2]];
  }
  function parseRgb(rgbAsString) {
    const rgbvalue = cleanDefinition(rgbAsString);
    const rgb = splitValues(rgbvalue);
    if (rgb.length !== 3 && rgb.length !== 4) {
      return fallbackRGB(
        rgb,
        `Too few values to define rgb: ${rgbAsString} -> ${rgbvalue}`
      );
    }
    return [rgb[0], rgb[1], rgb[2]];
  }
  function getRgbValues(rgb) {
    return {
      r: limitValue(Math.round(convertToInt8(rgb[0])), 0, 255) || 0,
      g: limitValue(Math.round(convertToInt8(rgb[1])), 0, 255) || 0,
      b: limitValue(Math.round(convertToInt8(rgb[2])), 0, 255) || 0
    };
  }
  function RGB(rgb) {
    return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  }

  // src/hex-utils.ts
  function shortHexToLongHex(value) {
    return Array.from(value).map((v) => (v + v).toUpperCase());
  }
  function isHex(num) {
    return Boolean(num.match(/^[0-9a-f]+$/i));
  }
  function parseHex(value) {
    const hexColor = value.substring(1);
    let hexArray = [];
    if (hexColor) {
      if (hexColor.length === 3 || hexColor.length === 4) {
        hexArray = shortHexToLongHex(hexColor);
      } else if (hexColor.length === 6 || hexColor.length === 8) {
        hexArray = (hexColor.match(/../g) || []).map((value2) => value2);
      }
    }
    if (hexArray.length) {
      hexArray?.forEach((value2, index) => {
        if (isHex(value2)) {
          hexArray[index] = value2.toUpperCase();
        } else {
          console.warn(`Invalid Hex value: ${value2}`);
        }
      });
      return hexArray;
    }
    console.warn(`Invalid Hex: ${value}`);
    return fallbackRGB(hexArray);
  }
  function hexToRgb(hex) {
    return {
      r: Number.parseInt(hex[0], 16),
      g: Number.parseInt(hex[1], 16),
      b: Number.parseInt(hex[2], 16)
    };
  }
  function toHex(int8) {
    return int8.toString(16).padStart(2, "0");
  }
  function valuesToHex(rgb) {
    return `#${toHex(rgb?.r)}${toHex(rgb?.g)}${toHex(rgb?.b)}`;
  }

  // src/hsl-utils.ts
  function fallbackHSL(hsl, err = "Invalid HSL color") {
    console.warn(err);
    return [hsl[0] ?? 0, hsl[1] ?? 0, hsl[2]];
  }
  function parseHsl(hslAsString) {
    const hslvalue = cleanDefinition(hslAsString);
    let hsl = splitValues(hslvalue);
    if (hsl.length !== 3 && hsl.length !== 4) {
      hsl = fallbackHSL(hsl);
    }
    return [hsl[0], hsl[1], hsl[2]];
  }
  var angleError = (value) => `Invalid angle: ${value} - The none keyword is invalid in legacy color syntax `;
  function getHslValues(hsl) {
    return {
      h: colorValueFallbacks(hsl[0], angleError(hsl[0])) || Math.round(normalizeDegrees(hsl[0])) || 0,
      s: colorValueFallbacks(hsl[1]) || convertToInt8(hsl[1], 100) || 0,
      l: colorValueFallbacks(hsl[2]) || convertToInt8(hsl[2], 100) || 0
    };
  }
  function getHue(c, x, h) {
    if (h < 60) return [c, x, 0];
    if (h < 120) return [x, c, 0];
    if (h < 180) return [0, c, x];
    if (h < 240) return [0, x, c];
    if (h < 300) return [x, 0, c];
    return [c, 0, x];
  }
  function hslToRgb(hslColor) {
    const hsl = getHslValues(hslColor);
    const s = hsl.s / 100;
    const l = hsl.l / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(hsl.h / 60 % 2 - 1));
    const m = l - c / 2;
    let [r, g, b] = getHue(c, x, hsl.h);
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    return { r, g, b };
  }
  function valuesToHsl({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;
    const cmin = Math.min(r, g, b);
    const cmax = Math.max(r, g, b);
    const delta = cmax - cmin;
    let h = 0;
    let s = 0;
    let l = 0;
    if (delta === 0) {
      h = 0;
    } else if (cmax === r) {
      h = (g - b) / delta % 6;
    } else if (cmax === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) {
      h += 360;
    }
    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
    return HSL({ h, s, l });
  }
  function HSL(hsl) {
    return `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`;
  }

  // src/color-utils.ts
  function getColor(searchedColor, set = colorSet_default) {
    const color = set.find(
      (color2) => color2[3] === searchedColor
    );
    if (typeof color !== "undefined") {
      const [r, g, b] = color;
      return {
        hex: valuesToHex({ r, g, b }),
        rgb: RGB({ r, g, b }),
        hsl: valuesToHsl({ r, g, b })
      };
    }
    throw new Error(`Error: invalid color ${searchedColor} or empty colorSet`);
  }
  function getColors() {
    return colorSet_default.map((colorData) => {
      return {
        name: colorData[3],
        ...getColor(colorData[3])
      };
    });
  }

  // src/index.ts
  var colorParsers = [
    { regex: hexRegex, parser: parseHex, converter: hexToRgb },
    { regex: rgbRegex, parser: parseRgb, converter: getRgbValues },
    { regex: hslRegex, parser: parseHsl, converter: hslToRgb }
  ];
  function closest(color, set = colorSet_default, args) {
    let closestGap = Number.MAX_SAFE_INTEGER;
    const closestColor = { name: "error", color: "#F00" };
    if (set.length < 1) {
      return closestColor;
    }
    const rgbColorValues = Object.values(parseColor(color));
    const colorSetLength = set.length;
    const precomputedRGBValues = set.map((item) => [item[0], item[1], item[2]]);
    for (let i = 0; i < colorSetLength; i++) {
      const tested = precomputedRGBValues[i];
      const gap = distance(rgbColorValues, tested, true);
      if (gap < closestGap) {
        closestGap = gap;
        closestColor.name = set[i][3];
        closestColor.color = `rgb(${set[i][0]},${set[i][1]},${set[i][2]})`;
      }
      if (gap === 0) {
        break;
      }
    }
    if (args?.info) {
      const colorValue = getColor(closestColor.name, set);
      return {
        ...colorValue,
        ...closestColor,
        gap: Math.sqrt(closestGap)
      };
    }
    return closestColor;
  }
  function parseColor(colorString) {
    for (const { regex, parser, converter } of colorParsers) {
      if (regex.test(colorString)) {
        const result = parser(colorString);
        return converter(result);
      }
    }
    throw new Error(`Invalid color: ${colorString}`);
  }
  function isLight(color) {
    return closest(color, BLACKANDWHITE).name === "white";
  }
  function isDark(color) {
    return closest(color, BLACKANDWHITE).name === "black";
  }
  function closestRGB(color) {
    return closest(color, RGBSET).name;
  }
  function distance(rgb1, rgb2, fast = false) {
    const [rDiff, gDiff, bDiff] = [
      rgb2[0] - rgb1[0],
      rgb2[1] - rgb1[1],
      rgb2[2] - rgb1[2]
    ];
    const dist = rDiff * rDiff + gDiff * gDiff + bDiff * bDiff;
    return fast ? dist : Math.sqrt(dist);
  }
  function rgbToHex(rgbString) {
    if (rgbRegex.test(rgbString)) {
      const rgb = parseRgb(rgbString);
      const RgbValues = getRgbValues(rgb);
      return valuesToHex(RgbValues);
    }
    throw new Error(`Invalid color: ${rgbString}`);
  }
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=color-2-name.js.map
