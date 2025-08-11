import { HSLVALUE, RGBVALUE } from './types.cjs';

declare function fallbackHSL(hsl: string[], err?: string): string[];
/**
 * Get the values of the hsl string
 *
 * @param {string} hslAsString - the valid hsl color string
 * @return {string[]} the values of the hsl string
 */
declare function parseHsl(hslAsString: string): string[];
/**
 * This function takes an array of strings and returns and object with the hsl values converted into INT8 (0-255)
 *
 * @param {string[]} hsl - the hsl values to parse from string to int8 values
 *
 */
declare function getHslValues(hsl: string[]): HSLVALUE;
/**
 * Given the HSL color it convert the color into RGB
 *
 * @param {string[]} hslColor the HSL value to parse
 * @return {Object} rgb value
 */
declare function hslToRgb(hslColor: string[]): RGBVALUE;
/**
 * Given the RGB color it convert the color into HSL
 *
 * @param {number} r - red
 * @param {number} g - green
 * @param {number} b - blue
 *
 * @return {Object} hsl value
 */
declare function valuesToHsl({ r, g, b }: RGBVALUE): string;
/**
 * Converts an HSL color object to a string representation.
 *
 * @param {Object} hsl - Object containing the HSL color values.
 * @param {number} hsl.h - The hue value of the color.
 * @param {number} hsl.s - The saturation value of the color.
 * @param {number} hsl.l - The lightness value of the color.
 * @return {string} The HSL color as a string.
 */
declare function HSL(hsl: {
    h: number;
    s: number;
    l: number;
}): string;

export { HSL, fallbackHSL, getHslValues, hslToRgb, parseHsl, valuesToHsl };
