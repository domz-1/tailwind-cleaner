import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { closest } from 'color-2-name';

// Default configuration
const DEFAULT_CONFIG = {
    extensions: [
        '.jsx',
        '.js',
        '.html',
        '.vue',
        '.tsx',
        '.ts',
        '.css',
        '.scss',
        '.less',
    ],
    excludeDirs: ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'],
    tailwindConfig: 'tailwind.config.js',
    colorApiUrl: 'https://api.color.pizza/v1/?list=default',
    prefix: undefined, // Default to no prefix
};

class ColorReplacer {
    constructor(config = {}) {
        // Merge provided config with default config
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.availableColors = new Map(); // All API colors (exact from default list + closest for unknowns)
        this.tailwindColors = new Map(); // Colors from Tailwind config
        this.colorMap = new Map(); // Only used colors
        this.processedFiles = 0;
        this.replacements = 0;
        this.tailwindMatches = 0; // Track Tailwind config matches
        this.apiExactMatches = 0; // Track exact API matches
        this.apiClosestMatches = 0; // Track closest API and color-2-name matches
        // Reserved Tailwind utility prefixes to avoid conflicts
        this.reservedNames = new Set([
            'border',
            'text',
            'bg',
            'ring',
            'shadow',
            'from',
            'via',
            'to',
            'accent',
            'decoration',
            'divide',
            'outline',
            'fill',
            'stroke',
            'caret',
            'placeholder',
            'current',
            'transparent',
            'inherit',
        ]);
    }

    // Parse color string to hex (opaque only)
    parseColorToHex(color) {
        color = color.trim().toLowerCase();
        // Handle hex
        if (color.startsWith('#')) {
            let hex = color.slice(1);
            let rgbHex, alphaHex;
            if (hex.length === 3) {
                rgbHex = hex
                    .split('')
                    .map((c) => c + c)
                    .join('');
                alphaHex = 'ff';
            } else if (hex.length === 4) {
                let [r, g, b, a] = hex.split('');
                rgbHex = r + r + g + g + b + b;
                alphaHex = a + a;
            } else if (hex.length === 6) {
                rgbHex = hex;
                alphaHex = 'ff';
            } else if (hex.length === 8) {
                rgbHex = hex.slice(0, 6);
                alphaHex = hex.slice(6);
            } else {
                return null;
            }
            if (alphaHex !== 'ff') return null;
            return rgbHex;
        }
        // Handle rgb/rgba legacy (with commas)
        let rgbMatch = color.match(
            /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([\d.]+))?\s*\)$/
        );
        if (rgbMatch) {
            let [, r, g, b, , a] = rgbMatch;
            a = a || 1;
            if (parseFloat(a) !== 1) return null;
            r = parseInt(r);
            g = parseInt(g);
            b = parseInt(b);
            if (
                isNaN(r) ||
                isNaN(g) ||
                isNaN(b) ||
                r < 0 ||
                r > 255 ||
                g < 0 ||
                g > 255 ||
                b < 0 ||
                b > 255
            )
                return null;
            return (
                r.toString(16).padStart(2, '0') +
                g.toString(16).padStart(2, '0') +
                b.toString(16).padStart(2, '0')
            );
        }
        // Handle rgb/rgba modern (spaces, / for alpha)
        rgbMatch = color.match(
            /^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(\/\s*([\d.]+))?\s*\)$/
        );
        if (rgbMatch) {
            let [, r, g, b, , a] = rgbMatch;
            a = a || 1;
            if (parseFloat(a) !== 1) return null;
            r = parseInt(r);
            g = parseInt(g);
            b = parseInt(b);
            if (
                isNaN(r) ||
                isNaN(g) ||
                isNaN(b) ||
                r < 0 ||
                r > 255 ||
                g < 0 ||
                g > 255 ||
                b < 0 ||
                b > 255
            )
                return null;
            return (
                r.toString(16).padStart(2, '0') +
                g.toString(16).padStart(2, '0') +
                b.toString(16).padStart(2, '0')
            );
        }
        // Handle hsl/hsla legacy (with commas)
        let hslMatch = color.match(
            /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(,\s*([\d.]+))?\s*\)$/
        );
        if (hslMatch) {
            let [, h, s, l, , a] = hslMatch;
            a = a || 1;
            if (parseFloat(a) !== 1) return null;
            h = parseInt(h) / 360;
            s = parseInt(s) / 100;
            l = parseInt(l) / 100;
            return this.hslToHex(h, s, l);
        }
        // Handle hsl/hsla modern (spaces, / for alpha)
        hslMatch = color.match(
            /^hsla?\(\s*(\d+)\s+(\d+)%\s+(\d+)%\s*(\/\s*([\d.]+))?\s*\)$/
        );
        if (hslMatch) {
            let [, h, s, l, , a] = hslMatch;
            a = a || 1;
            if (parseFloat(a) !== 1) return null;
            h = parseInt(h) / 360;
            s = parseInt(s) / 100;
            l = parseInt(l) / 100;
            return this.hslToHex(h, s, l);
        }
        return null;
    }

    // Helper to convert HSL to HEX
    hslToHex(h, s, l) {
        let r = 0,
            g = 0,
            b = 0;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        const toHex = (x) =>
            Math.round(x * 255)
                .toString(16)
                .padStart(2, '0');
        return toHex(r) + toHex(g) + toHex(b);
    }

    // Parse Tailwind config and extract existing colors
    async loadTailwindColors(rootDir) {
        const configPath = path.join(rootDir, this.config.tailwindConfig);
        try {
            await fs.access(configPath);
            console.log('📋 Loading existing colors from Tailwind config...');
            const configContent = await fs.readFile(configPath, 'utf8');
            // Extract colors from various patterns in the config
            this.extractColorsFromConfig(configContent);
            if (this.tailwindColors.size > 0) {
                console.log(
                    `✅ Found ${this.tailwindColors.size} existing colors in Tailwind config`
                );
                // Show some examples
                let count = 0;
                console.log('   Examples:');
                for (const [hex, name] of this.tailwindColors) {
                    if (count < 3) {
                        console.log(`     #${hex} → ${name}`);
                        count++;
                    }
                }
                if (this.tailwindColors.size > 3) {
                    console.log(
                        `     ... and ${this.tailwindColors.size - 3} more`
                    );
                }
            } else {
                console.log('ℹ️  No existing colors found in Tailwind config');
            }
        } catch (error) {
            console.log('ℹ️  No tailwind.config.js found or unable to read it');
        }
    }

    // Extract colors from Tailwind config content
    extractColorsFromConfig(configContent) {
        console.log('🔍 Extracting colors from Tailwind config...');
        console.log('📄 Original config content length:', configContent.length);
        // Remove comments for easier parsing
        const cleanContent = configContent
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');
        console.log('🧹 Cleaned content length:', cleanContent.length);
        // Pattern to match color definitions in various formats
        const colorPatterns = [
            // Match 'colorname': '#hexcode' or "colorname": "#hexcode"
            /['"`]([^'"`]+)['"`]\s*:\s*['"`](#[0-9a-fA-F]{6})['"`]/g,
            // Match colorname: '#hexcode' (without quotes around key)
            /(\w+)\s*:\s*['"`](#[0-9a-fA-F]{6})['"`]/g,
        ];
        colorPatterns.forEach((pattern, index) => {
            console.log(`🎯 Processing pattern ${index + 1}:`, pattern.source);
            let match;
            let patternMatches = 0;
            while ((match = pattern.exec(cleanContent)) !== null) {
                const [fullMatch, colorName, hexValue] = match;
                console.log(`📌 Found match:`, {
                    fullMatch,
                    colorName,
                    hexValue,
                });
                const hex = hexValue.replace('#', '').toLowerCase();
                if (!this.reservedNames.has(colorName)) {
                    this.tailwindColors.set(hex, colorName);
                    patternMatches++;
                }
            }
            console.log(
                `📊 Pattern ${index + 1} found ${patternMatches} valid colors`
            );
        });
        console.log('🔄 Processing nested colors...');
        // Also try to extract colors from more complex nested structures
        this.extractNestedColors(cleanContent);
        console.log(`✨ Total colors extracted: ${this.tailwindColors.size}`);
    }

    // Extract colors from nested objects like colors: { primary: { 500: '#123456' } }
    extractNestedColors(content) {
        // This is a simplified approach - could be enhanced with a proper JS parser
        const nestedColorRegex =
            /(\w+):\s*{[^}]*['"`](\d+)['"`]\s*:\s*['"`](#[0-9a-fA-F]{6})['"`]/g;
        let match;
        while ((match = nestedColorRegex.exec(content)) !== null) {
            const [, colorFamily, shade, hexValue] = match;
            const hex = hexValue.replace('#', '').toLowerCase();
            const colorName =
                shade === '500' ? colorFamily : `${colorFamily}-${shade}`;
            if (!this.reservedNames.has(colorName)) {
                this.tailwindColors.set(hex, colorName);
            }
        }
    }

    // Find color name with priority: Tailwind config > API (exact or closest) > color-2-name
    findColorName(hex) {
        const hexLower = hex.toLowerCase();
        // Priority 1: Check Tailwind config first and use EXACTLY what's in the config
        if (this.tailwindColors.has(hexLower)) {
            const colorName = this.tailwindColors.get(hexLower);
            console.log(`🎯 Tailwind config match: #${hex} → ${colorName}`);
            this.tailwindMatches++;
            return colorName; // Return the exact name from config without modification
        }
        // Priority 2: Check available colors from Color Pizza API (preloaded exact + queried closest)
        if (this.availableColors.has(hexLower)) {
            const colorInfo = this.availableColors.get(hexLower);
            const colorName = colorInfo.name;
            console.log(`🍕 API match: #${hex} → ${colorName}`);
            if (colorInfo.distance === 0) {
                this.apiExactMatches++;
            } else {
                this.apiClosestMatches++;
            }
            return colorName;
        }
        // Priority 3: Fallback to color-2-name for local color name lookup
        try {
            const colorResult = closest(`#${hexLower}`);
            if (colorResult && colorResult.name) {
                const colorName = this.sanitizeName(colorResult.name);
                console.log(
                    `🖌️ color-2-name fallback match: #${hex} → ${colorName}`
                );
                this.availableColors.set(hexLower, {
                    name: colorName,
                    distance: colorResult.distance || 0,
                }); // Cache the result
                this.apiClosestMatches++; // Count as a closest match for consistency
                return colorName;
            }
            console.warn(`⚠️ color-2-name returned no valid name for #${hex}`);
            return null;
        } catch (error) {
            console.warn(
                `⚠️ color-2-name failed for #${hex}: ${error.message}`
            );
            return null; // Return null if no match is found
        }
    }

    // Fetch exact colors from Color Pizza API default list
    async fetchExactColors() {
        return new Promise((resolve, reject) => {
            https
                .get(this.config.colorApiUrl, (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            if (
                                response.colors &&
                                Array.isArray(response.colors)
                            ) {
                                response.colors.forEach((color) => {
                                    if (color.hex && color.name) {
                                        const hex = color.hex
                                            .replace('#', '')
                                            .toLowerCase();
                                        const cssName = this.sanitizeName(
                                            color.name
                                        );
                                        this.availableColors.set(hex, {
                                            name: cssName,
                                            distance: 0,
                                        });
                                    }
                                });
                                console.log(
                                    `✅ Loaded ${this.availableColors.size} exact colors from Color Pizza API default list`
                                );
                                resolve();
                            } else {
                                reject(
                                    new Error('Invalid API response format')
                                );
                            }
                        } catch (error) {
                            reject(
                                new Error(
                                    `Failed to parse API response: ${error.message}`
                                )
                            );
                        }
                    });
                })
                .on('error', (error) => {
                    reject(new Error(`API request failed: ${error.message}`));
                });
        });
    }

    // Fetch closest color names for unknown hex values using Color Pizza API
    async fetchClosestColorNames(unknownHex) {
        if (unknownHex.length === 0) return;
        return new Promise((resolve, reject) => {
            const values = unknownHex.join(',');
            const url = `https://api.color.pizza/v1/?values=${values}&list=default&goodnamesonly=true&noduplicates=true`;
            https
                .get(url, (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            if (
                                response.colors &&
                                response.colors.length === unknownHex.length
                            ) {
                                response.colors.forEach((color, i) => {
                                    const hex = unknownHex[i];
                                    const name = this.sanitizeName(color.name);
                                    this.availableColors.set(hex, {
                                        name,
                                        distance: color.distance,
                                    });
                                    if (color.distance === 0) {
                                        console.log(
                                            `🍕 Exact API match for #${hex}: ${name}`
                                        );
                                        this.apiExactMatches++;
                                    } else {
                                        console.log(
                                            `🔍 Closest API match for #${hex}: ${name} (distance: ${color.distance})`
                                        );
                                        this.apiClosestMatches++;
                                    }
                                });
                                resolve();
                            } else {
                                reject(
                                    new Error('Invalid API response format')
                                );
                            }
                        } catch (error) {
                            reject(
                                new Error(
                                    `Failed to parse API response: ${error.message}`
                                )
                            );
                        }
                    });
                })
                .on('error', (error) => {
                    reject(new Error(`API request failed: ${error.message}`));
                });
        });
    }

    // Collect all unique hex colors from files
    async collectUniqueHex(files) {
        const hexSet = new Set();
        const patterns = [
            /((?:bg|text|border|ring|shadow|from|via|to|accent|decoration|divide|outline|fill|stroke|caret|placeholder)-)\[([^\]]+)\]/g,
        ];
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                patterns.forEach((pattern) => {
                    let match;
                    const regex = new RegExp(pattern.source, pattern.flags);
                    while ((match = regex.exec(content)) !== null) {
                        let value = match[2];
                        value = value.replace(/_/g, ' '); // Replace underscores with spaces for multi-word values
                        const hex = this.parseColorToHex(value);
                        if (hex) {
                            hexSet.add(hex);
                        }
                    }
                });
            } catch (error) {
                console.warn(
                    `⚠️  Error reading file ${file}: ${error.message}`
                );
            }
        }
        return Array.from(hexSet);
    }

    // Convert name to kebab-case CSS-friendly and avoid conflicts, adding prefix if configured
    sanitizeName(name) {
        // Skip sanitization if this is a Tailwind config color name
        if (Array.from(this.tailwindColors.values()).includes(name)) {
            return name;
        }
        let sanitized = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        // Apply prefix if defined
        if (this.config.prefix) {
            sanitized = `${this.config.prefix}-${sanitized}`;
        }
        // Avoid conflicts with Tailwind utility prefixes
        if (this.reservedNames.has(sanitized)) {
            sanitized = `color-${sanitized}`;
        }
        // Ensure it doesn't start with a number
        if (/^\d/.test(sanitized)) {
            sanitized = `color-${sanitized}`;
        }
        // Fallback for empty names
        if (!sanitized) {
            sanitized = this.config.prefix
                ? `${this.config.prefix}-unnamed-color`
                : 'unnamed-color';
        }
        return sanitized;
    }

    // Replace hex colors in text with named ones
    replaceColorsInText(content) {
        let modified = false;
        let newContent = content;
        // Improved regex to handle various Tailwind color patterns
        const patterns = [
            // Standard utility classes: bg-[anycolor], text-[anycolor], etc.
            /((?:bg|text|border|ring|shadow|from|via|to|accent|decoration|divide|outline|fill|stroke|caret|placeholder)-)\[([^\]]+)\]/g,
        ];
        patterns.forEach((pattern) => {
            newContent = newContent.replace(pattern, (match, prefix, value) => {
                value = value.replace(/_/g, ' '); // Replace underscores with spaces
                const hex = this.parseColorToHex(value);
                if (hex) {
                    const hexLower = hex.toLowerCase();
                    const colorName = this.findColorName(hex);
                    if (colorName) {
                        // Store the mapping (use original hex for consistency)
                        if (!this.colorMap.has(hexLower)) {
                            this.colorMap.set(hexLower, colorName);
                        }
                        this.replacements++;
                        modified = true;
                        // If this was a Tailwind config match, use the exact name from config
                        if (this.tailwindColors.has(hexLower)) {
                            const existingPrefix = prefix.match(/(\w+)-/)[1];
                            return `${existingPrefix}-${colorName}`;
                        }
                        // For API/fallback matches, clean up the prefix
                        const cleanPrefix = prefix
                            .replace(/\[#?$/, '')
                            .replace(/-$/, '');
                        return `${cleanPrefix}-${colorName}`;
                    }
                    // No match found, keep original
                    console.log(`❌ No match found for #${hex}`);
                    return match;
                }
                // Not a valid color, keep original
                return match;
            });
        });
        return { content: newContent, modified };
    }

    // Process a file
    async processFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const { content: newContent, modified } =
                this.replaceColorsInText(content);
            if (modified) {
                await fs.writeFile(filePath, newContent, 'utf8');
                console.log(`✏️  Modified: ${filePath}`);
            }
            this.processedFiles++;
        } catch (error) {
            console.error(
                `❌ Error processing file ${filePath}: ${error.message}`
            );
        }
    }

    // Recursively find files
    async findFiles(dir) {
        const files = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!this.config.excludeDirs.includes(entry.name)) {
                        files.push(...(await this.findFiles(fullPath)));
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (this.config.extensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.warn(
                `⚠️  Warning: Cannot read directory ${dir}: ${error.message}`
            );
        }
        return files;
    }

    // Improved Tailwind config updating with better parsing
    async updateTailwindConfig(rootDir) {
        const configPath = path.join(rootDir, this.config.tailwindConfig);
        // Only add colors that aren't already in the Tailwind config
        const newColors = {};
        this.colorMap.forEach((name, hex) => {
            if (!this.tailwindColors.has(hex)) {
                newColors[name] = `#${hex}`;
            }
        });
        // If no new colors to add, skip config update
        if (Object.keys(newColors).length === 0) {
            console.log(
                'ℹ️  All used colors already exist in Tailwind config - no update needed'
            );
            return;
        }
        try {
            await fs.access(configPath);
        } catch {
            console.log(`ℹ️  No tailwind.config.js found, creating new one...`);
            return this.createTailwindConfig(configPath, newColors);
        }
        try {
            let configContent = await fs.readFile(configPath, 'utf8');
            // Strategy 1: Look for theme.extend.colors pattern
            if (await this.updateExtendColors(configContent, newColors)) {
                return;
            }
            // Strategy 2: Look for theme.colors pattern and convert to extend
            if (await this.updateThemeColors(configContent, newColors)) {
                return;
            }
            // Strategy 3: Look for existing theme object and add extend
            if (await this.addExtendToTheme(configContent, newColors)) {
                return;
            }
            // Strategy 4: Look for existing extend object and add colors
            if (await this.addColorsToExtend(configContent, newColors)) {
                return;
            }
            // Strategy 5: Add complete theme structure
            await this.addCompleteTheme(configPath, configContent, newColors);
        } catch (error) {
            console.error(
                `❌ Error updating tailwind config: ${error.message}`
            );
        }
    }

    // Strategy 1: Update existing theme.extend.colors
    async updateExtendColors(configContent, colorsObj) {
        const configPath = path.join(process.cwd(), this.config.tailwindConfig);
        // Match theme: { extend: { colors: { ... } } }
        const extendColorsRegex =
            /(theme:\s*{[\s\S]*?extend:\s*{[\s\S]*?colors:\s*{)([^}]*(?:{[^}]*}[^}]*)*)(}[\s\S]*?}[\s\S]*?})/;
        const match = configContent.match(extendColorsRegex);
        if (match) {
            const [, prefix, existingColors, suffix] = match;
            // Parse existing colors
            const existingColorsObj = this.parseColorsObject(existingColors);
            // Merge with new colors (new colors take precedence)
            const mergedColors = { ...existingColorsObj, ...colorsObj };
            // Format merged colors
            const formattedColors = this.formatColorsObject(mergedColors, 8); // 8 spaces for proper indentation
            const newConfigContent = configContent.replace(
                extendColorsRegex,
                `${prefix}${formattedColors}${suffix}`
            );
            await fs.writeFile(configPath, newConfigContent, 'utf8');
            console.log(
                `✅ Updated existing theme.extend.colors with ${Object.keys(colorsObj).length
                } new colors`
            );
            return true;
        }
        return false;
    }

    // Strategy 2: Update theme.colors and convert to extend pattern
    async updateThemeColors(configContent, colorsObj) {
        const configPath = path.join(process.cwd(), this.config.tailwindConfig);
        // Match theme: { colors: { ... } } without extend
        const themeColorsRegex =
            /(theme:\s*{)(?![^}]*extend)([^}]*colors:\s*{)([^}]*(?:{[^}]*}[^}]*)*)(}[^}]*)(})/;
        const match = configContent.match(themeColorsRegex);
        if (match) {
            const [
                ,
                themePrefix,
                colorsPrefix,
                existingColors,
                colorsSuffix,
                themeSuffix,
            ] = match;
            // Parse existing colors
            const existingColorsObj = this.parseColorsObject(existingColors);
            // Merge colors
            const mergedColors = { ...existingColorsObj, ...colorsObj };
            // Create extend structure
            const formattedColors = this.formatColorsObject(mergedColors, 8);
            const newConfigContent = configContent.replace(
                themeColorsRegex,
                `${themePrefix}\n    extend: {\n      colors: {\n${formattedColors}\n      }\n    }${themeSuffix}`
            );
            await fs.writeFile(configPath, newConfigContent, 'utf8');
            console.log(
                `✅ Converted theme.colors to theme.extend.colors and added ${Object.keys(colorsObj).length
                } new colors`
            );
            return true;
        }
        return false;
    }

    // Strategy 3: Add extend to existing theme
    async addExtendToTheme(configContent, colorsObj) {
        const configPath = path.join(process.cwd(), this.config.tailwindConfig);
        // Match theme: { ... } without extend
        const themeRegex = /(theme:\s*{)(?![^}]*extend)([^}]*)(})/;
        const match = configContent.match(themeRegex);
        if (match) {
            const [, prefix, content, suffix] = match;
            const formattedColors = this.formatColorsObject(colorsObj, 8);
            const newConfigContent = configContent.replace(
                themeRegex,
                `${prefix}${content}\n    extend: {\n      colors: {\n${formattedColors}\n      }\n    }${suffix}`
            );
            await fs.writeFile(configPath, newConfigContent, 'utf8');
            console.log(
                `✅ Added extend.colors to existing theme with ${Object.keys(colorsObj).length
                } colors`
            );
            return true;
        }
        return false;
    }

    // Strategy 4: Add colors to existing extend
    async addColorsToExtend(configContent, colorsObj) {
        const configPath = path.join(process.cwd(), this.config.tailwindConfig);
        // Match theme: { extend: { ... } } without colors
        const extendRegex =
            /(theme:\s*{[\s\S]*?extend:\s*{)(?![^}]*colors)([^}]*)(}[\s\S]*?})/;
        const match = configContent.match(extendRegex);
        if (match) {
            const [, prefix, content, suffix] = match;
            const formattedColors = this.formatColorsObject(colorsObj, 8);
            const newConfigContent = configContent.replace(
                extendRegex,
                `${prefix}${content}\n      colors: {\n${formattedColors}\n      },${suffix}`
            );
            await fs.writeFile(configPath, newConfigContent, 'utf8');
            console.log(
                `✅ Added colors to existing extend with ${Object.keys(colorsObj).length
                } colors`
            );
            return true;
        }
        return false;
    }

    // Strategy 5: Add complete theme structure
    async addCompleteTheme(configPath, configContent, colorsObj) {
        // Look for module.exports = { ... }
        const moduleExportsRegex = /(module\.exports\s*=\s*{)([^}]*)(})/;
        const match = configContent.match(moduleExportsRegex);
        if (match) {
            const [, prefix, content, suffix] = match;
            const formattedColors = this.formatColorsObject(colorsObj, 8);
            const newConfigContent = configContent.replace(
                moduleExportsRegex,
                `${prefix}${content}\n  theme: {\n    extend: {\n      colors: {\n${formattedColors}\n      }\n    }\n  },${suffix}`
            );
            await fs.writeFile(configPath, newConfigContent, 'utf8');
            console.log(
                `✅ Added complete theme structure with ${Object.keys(colorsObj).length
                } colors`
            );
        } else {
            // Fallback: append to end of file
            const formattedColors = this.formatColorsObject(colorsObj, 8);
            const themeAddition = `\n\n// Colors added by Color Pizza replacer\nif (module.exports.theme) {\n  if (module.exports.theme.extend) {\n    module.exports.theme.extend.colors = {\n      ...module.exports.theme.extend.colors,\n${formattedColors}\n    };\n  } else {\n    module.exports.theme.extend = {\n      colors: {\n${formattedColors}\n      }\n    };\n  }\n} else {\n  module.exports.theme = {\n    extend: {\n      colors: {\n${formattedColors}\n      }\n    }\n  };\n}`;
            await fs.writeFile(
                configPath,
                configContent + themeAddition,
                'utf8'
            );
            console.log(
                `✅ Appended theme colors with fallback method (${Object.keys(colorsObj).length
                } colors)`
            );
        }
    }

    // Parse colors object from string
    parseColorsObject(colorsString) {
        const colors = {};
        // Simple parser for key: value pairs
        const colorRegex = /['"`]([^'"`]+)['"`]\s*:\s*['"`]([^'"`]+)['"`]/g;
        let match;
        while ((match = colorRegex.exec(colorsString)) !== null) {
            const [, key, value] = match;
            colors[key] = value;
        }
        return colors;
    }

    // Format colors object with proper indentation
    formatColorsObject(colorsObj, indent = 8) {
        const spaces = ' '.repeat(indent);
        return Object.entries(colorsObj)
            .map(([key, value]) => `${spaces}'${key}': '${value}'`)
            .join(',\n');
    }

    // Create Tailwind config with used colors
    async createTailwindConfig(configPath, colorsObj) {
        const formattedColors = this.formatColorsObject(colorsObj, 8);
        const configContent = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
${formattedColors}
      }
    },
  },
  plugins: [],
}`;
        await fs.writeFile(configPath, configContent, 'utf8');
        console.log(
            `✅ Created tailwind.config.js with ${Object.keys(colorsObj).length
            } colors`
        );
    }

    // Run script
    async run(rootDir = '.') {
        console.log(
            `🚀 Starting Enhanced Color Pizza color replacement with color-2-name fallback${this.config.prefix ? ` and prefix "${this.config.prefix}"` : ''}...\n`
        );
        try {
            // FIRST: Load existing Tailwind colors (highest priority)
            await this.loadTailwindColors(rootDir);
            console.log('\n📡 Fetching exact colors from Color Pizza API...');
            await this.fetchExactColors();
            console.log('\n📂 Finding files to process...');
            const files = await this.findFiles(rootDir);
            console.log(`Found ${files.length} files to process`);
            console.log('\n🔍 Collecting unique hex colors from files...');
            const allHex = await this.collectUniqueHex(files);
            const unknownHex = allHex.filter(
                (hex) =>
                    !this.tailwindColors.has(hex) &&
                    !this.availableColors.has(hex)
            );
            if (unknownHex.length > 0) {
                console.log(
                    `📡 Fetching closest names for ${unknownHex.length} unknown colors from Color Pizza API...`
                );
                await this.fetchClosestColorNames(unknownHex);
            } else {
                console.log(
                    'ℹ️  All hex colors are either in Tailwind config or exact API matches - no additional query needed'
                );
            }
            console.log('\n🔄 Processing files...');
            for (const file of files) {
                await this.processFile(file);
            }
            if (this.colorMap.size > 0) {
                console.log('\n⚙️  Updating Tailwind configuration...');
                await this.updateTailwindConfig(rootDir);
            }
            console.log('\n📊 Results:');
            console.log(`├── Files processed: ${this.processedFiles}`);
            console.log(`├── Total color replacements: ${this.replacements}`);
            console.log(`├── Tailwind config matches: ${this.tailwindMatches}`);
            console.log(`├── API exact matches: ${this.apiExactMatches}`);
            console.log(
                `├── API and color-2-name closest matches: ${this.apiClosestMatches}`
            );
            console.log(`└── Unique colors used: ${this.colorMap.size}`);
            if (this.replacements > 0) {
                console.log(
                    '\n✨ Success! Colors have been replaced with prioritized naming.'
                );
                console.log(
                    "💡 Don't forget to restart your dev server and rebuild."
                );
                // Show some examples of what was replaced
                console.log('\n📋 Example replacements made:');
                let count = 0;
                for (const [hex, name] of this.colorMap) {
                    if (count < 5) {
                        const source = this.tailwindColors.has(hex)
                            ? '(Tailwind)'
                            : '(API/color-2-name)';
                        console.log(`  #${hex} → ${name} ${source}`);
                        count++;
                    }
                }
                if (this.colorMap.size > 5) {
                    console.log(`  ... and ${this.colorMap.size - 5} more`);
                }
                if (this.tailwindMatches > 0) {
                    console.log(
                        `\n🎯 ${this.tailwindMatches} colors were matched from existing Tailwind config`
                    );
                }
                if (this.apiClosestMatches > 0) {
                    console.log(
                        `🔍 ${this.apiClosestMatches} colors were matched using closest API or color-2-name detection`
                    );
                }
            } else {
                console.log('\nℹ️  No hex color patterns found to replace.');
            }
        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Export the class for programmatic use
export default ColorReplacer;

// If run directly, execute the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    const config = {
        prefix: process.argv[2] || undefined, // Take prefix from command line or set to undefined
    };
    const replacer = new ColorReplacer(config);
    const rootDir = process.argv[3] || '.';
    console.log(
        `🎨 Enhanced Color Pizza Tailwind Replacer with Config Priority and color-2-name Fallback${config.prefix ? ` (Prefix: ${config.prefix})` : ''}`
    );
    console.log(
        '===============================================================\n'
    );
    replacer.run(rootDir).catch((error) => {
        console.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}