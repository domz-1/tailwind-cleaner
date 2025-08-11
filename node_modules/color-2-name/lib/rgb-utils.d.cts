import { RGBVALUE } from './types.cjs';

declare function fallbackRGB(rgb: string[], err?: string): string[];
/**
 * Get the values of the rgb string
 *
 * @param rgbAsString - the rgb color as string split into values
 *
 * @return {Array} the values of the rgb string as Array of strings that represent the rgb color
 */
declare function parseRgb(rgbAsString: string): string[];
/**
 * This function takes an array of strings and returns and object with the rgb values converted into INT8 (0-255)
 *
 * @param {Array} rgb - rgb color as Array of strings
 *
 * @return {Object} an object that contains the r, g and b values as INT8
 */
declare function getRgbValues(rgb: string[]): RGBVALUE;
/**
 * returns a string representation of the rgb values
 *
 * @param {Object} rgb the rgb color object
 *
 * @return {string} a string representation of the rgb values
 */
declare function RGB(rgb: RGBVALUE): string;

export { RGB, fallbackRGB, getRgbValues, parseRgb };
