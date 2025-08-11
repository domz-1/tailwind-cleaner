import { RGBCOLORDEF } from './types.js';

/**
 * This function was the opposite of the name of the repo and returns the color of the colorSet given the name
 *
 * @param {string} searchedColor -the name of the color to search for
 * @param {Array} set - the colorSet to search in
 */
declare function getColor(searchedColor: string, set?: RGBCOLORDEF[] | undefined): {
    hex: string;
    rgb: string;
    hsl: string;
};
/**
 * Get all the colors from the colorSet
 */
declare function getColors(): {
    hex: string;
    rgb: string;
    hsl: string;
    name: string | number;
}[];

export { getColor, getColors };
