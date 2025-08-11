import { COLORSTRING, RGBVALUE, HEX } from './types.cjs';

/**
 * It returns an object with the hex values of the 3 digit hex color
 *
 * @param {string} value 3 digit hex
 * @return {string[]} 6 digit hex
 */
declare function shortHexToLongHex(value: string): string[];
/**
 * Checks if a given string represents a hexadecimal number.
 *
 * @param {string} num - The string to be checked.
 * @return {boolean} Returns true if the string is a valid hexadecimal number, false otherwise.
 */
declare function isHex(num: string): boolean;
/**
 * Get the hex value of the color and convert it to an Object of R G And B values (still in hex format)
 *
 * @param value the string that contains the color in hex format
 *
 * @return {string[]} an array of 6 digit hex values in a triplet of R G and B (HEX format)
 */
declare function parseHex(value: COLORSTRING): string[];
/**
 * Converts a Hex color to rgb
 *
 * @param {string} hex a tuple of hex values
 *
 * @return {string} the rgb color values for the given hex color
 */
declare function hexToRgb(hex: string[]): RGBVALUE;
/**
 * Convert a INT8 value to HEX
 *
 * @param {number} int8 - the integer value to convert
 *
 * @return {string} the hex string
 */
declare function toHex(int8: number): string;
/**
 * Convert rgb values to hex color
 *
 * @param {Object} rgb an object with the rgb values
 *
 * @return {string} the hex string
 */
declare function valuesToHex(rgb: RGBVALUE): HEX;

export { hexToRgb, isHex, parseHex, shortHexToLongHex, toHex, valuesToHex };
