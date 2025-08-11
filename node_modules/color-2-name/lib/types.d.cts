/**
 * Types definition for common colors formats
 * supported format are: rgb, rgba, hsl, hsla, hex, hex+alpha
 */
type RGB = `rgb(${string},${string},${string})`;
type HSL = `hsl(${string},${string},${string})`;
type HEX = `#${string}` | string;
type WithAlpha<O> = O & {
    a: number;
};
type RGBA = WithAlpha<RGB>;
type HSLA = WithAlpha<HSL>;
type COLORSTRING = RGB | RGBA | HSL | HSLA | HEX;
interface HSLVALUE {
    h: number;
    s: number;
    l: number;
}
interface RGBVALUE {
    r: number;
    g: number;
    b: number;
}
type RGBCOLORDEF = [number, number, number, string];
type RGBDEF = [number, number, number];
type colorName = string;
interface COLORDEF {
    name: colorName;
    color: COLORSTRING;
    hex?: string;
    hsl?: string;
    gap?: number;
}
interface ColorParsers {
    regex: RegExp;
    parser: (color: string) => string[];
    converter: (colorSet: string[]) => RGBVALUE;
}
type colorListHEX = Array<{
    name: string;
    color: string;
}>;

export type { COLORDEF, COLORSTRING, ColorParsers, HEX, HSL, HSLA, HSLVALUE, RGB, RGBA, RGBCOLORDEF, RGBDEF, RGBVALUE, WithAlpha, colorListHEX, colorName };
