import { RGBCOLORDEF } from './types.cjs';

/** The maximum distance possible between colors */
declare const MAXDISTANCE = 441.6729559300637;
/** A regex to match hex colors */
declare const hexRegex: RegExp;
/** A regex to match rgb colors */
declare const rgbRegex: RegExp;
/** A regex to match hsl colors */
declare const hslRegex: RegExp;
/** A regex to match strings that are only valid numbers with and without decimals and the number can be negative and without the 0 in the beginning  */
declare const isNumeric: RegExp;
/** Remove comments from string */
declare const stripComments: RegExp;
/**
 * This set is used to detect if the color is bright or dark
 *
 * @note the set has been corrected to get pure RGB values (eg. pure red, pure green) in the "bright" area
 */
declare const BLACKANDWHITE: RGBCOLORDEF[];
/**
 * This set is used to detect the nearest rgb color
 */
declare const RGBSET: RGBCOLORDEF[];
/**
 * split the content of rgb and hsl colors depending on the parsed value of the css property
 *
 * https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb#syntax
 *
 * @param {string} rawValues - the value inside the rgb(.*) css color definition
 *
 * @return {Array} the array of rgb values found inside the passed string
 */
declare function splitValues(rawValues: string): string[];
/**
 * If the value is an angle in degrees, convert it to the 0-360 range
 *
 * @param {string} angle - the degrees to convert into a number
 *
 * @return {number} the converted value
 */
declare function normalizeDegrees(angle: string): number;
/**
 * Returns a value that is limited between a minimum and maximum value.
 *
 * @param {number} value - The value to be limited.
 * @param {number} min - The minimum allowed value (default is 0).
 * @param {number} max - The maximum allowed value (default is 0).
 * @return {number} The limited value.
 */
declare function limitValue(value: number, min?: number, max?: number): number;
/**
 * Calculates the value based on a given string and multiplier.
 *
 * @param {string} valueString - The string representing the value to be calculated.
 * @param {number} multiplier - The multiplier to be applied to the calculated value.
 * @return {number} The calculated value.
 */
declare function calculateValue(valueString: string, multiplier: number): number;
/**
 * Removes comments from the input string and extracts the content between the first opening parenthesis
 * and the last closing parenthesis.
 *
 * @param {string} string - The input string.
 * @return {string} The content between the first opening parenthesis and the last closing parenthesis.
 */
declare function cleanDefinition(string: string): string;
/**
 * Normalizes a percentage value by dividing it by 100 and multiplying it by a given multiplier.
 *
 * @param {string} value - The percentage value to be normalized.
 * @param {number} multiplier - The number to multiply the normalized percentage by.
 * @return {number} The normalized percentage value.
 */
declare function normalizePercentage(value: string, multiplier: number): number;
/**
 * Calculates the color value fallbacks for a given value.
 *
 * @param {string} value - The color value to calculate fallbacks for.
 * @param {string} [err] - An optional error message to display.
 * @return {number} - The calculated color value fallbacks.
 */
declare function colorValueFallbacks(value: string, err?: string): number;
/**
 * Takes a string with a css value that could be a number or percentage or an angle in degrees and returns the corresponding 8bit value
 *
 * @param value - a valid value for the css color definition (like 255, "100%", "324deg", etc.) *
 * @param multiplier - the number that represent the maximum - default is 255 decimal - 100 hex
 *
 * @example convertToInt8('100%'); // 255
 *
 * @return {string} the corresponding value in 8-bit format
 */
declare function convertToInt8(value: string | unknown, multiplier?: number): number;

export { BLACKANDWHITE, MAXDISTANCE, RGBSET, calculateValue, cleanDefinition, colorValueFallbacks, convertToInt8, hexRegex, hslRegex, isNumeric, limitValue, normalizeDegrees, normalizePercentage, rgbRegex, splitValues, stripComments };
