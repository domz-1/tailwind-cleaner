import fs from 'fs/promises';
import path from 'path';
import { closest } from 'color-2-name';
import chalk from 'chalk';
import ora from 'ora';

// Default configuration
const DEFAULT_CONFIG = {
    extensions: [
        '.jsx', '.js', '.html', '.vue', '.tsx', '.ts',
        '.css', '.scss', '.less',
    ],
    excludeDirs: ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'],
    tailwindConfig: 'tailwind.config.js',
    prefix: undefined,
    cssFile: undefined,
    useCssVariables: false,
};

/**
 * Luminance/tone qualifiers used to differentiate shades.
 * Ordered from darkest to lightest.
 */
const LUMINANCE_LABELS = [
    { max: 0.03, label: 'deepest' },
    { max: 0.06, label: 'deep' },
    { max: 0.10, label: 'darker' },
    { max: 0.15, label: 'dark' },
    { max: 0.30, label: '' },          // base (no qualifier)
    { max: 0.45, label: 'medium' },
    { max: 0.60, label: 'soft' },
    { max: 0.75, label: 'light' },
    { max: 0.90, label: 'lighter' },
    { max: 1.01, label: 'pale' },
];

class ColorReplacer {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.tailwindColors = new Map();   // Existing tw config: hex → name
        this.colorMap = new Map();          // Resolved: hex → name
        this.usedNames = new Set();         // Track all names to avoid collisions
        this.processedFiles = 0;
        this.replacements = 0;
        this.tailwindMatches = 0;
        this.libraryMatches = 0;

        // Reserved Tailwind utility prefixes to avoid conflicts
        this.reservedNames = new Set([
            'border', 'text', 'bg', 'ring', 'shadow', 'from', 'via', 'to',
            'accent', 'decoration', 'divide', 'outline', 'fill', 'stroke',
            'caret', 'placeholder', 'current', 'transparent', 'inherit',
        ]);
    }

    // ─── Hex Helpers ───────────────────────────────────────────────────

    hexToRgb(hex) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b };
    }

    /**
     * Relative luminance (0 = pure black, 1 = pure white)
     */
    getLuminance(hex) {
        const { r, g, b } = this.hexToRgb(hex);
        const toLinear = (c) => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    /**
     * Get a luminance-based qualifier for the color.
     */
    getLuminanceLabel(hex) {
        const lum = this.getLuminance(hex);
        for (const entry of LUMINANCE_LABELS) {
            if (lum < entry.max) return entry.label;
        }
        return '';
    }

    /**
     * Dominant hue for the color — helps differentiate
     * "dark-navy" from "dark-charcoal"
     */
    getHueHint(hex) {
        const { r, g, b } = this.hexToRgb(hex);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;

        // If the color is very desaturated (grey), return empty
        if (diff < 20) return '';

        let h;
        if (max === r) h = ((g - b) / diff) % 6;
        else if (max === g) h = (b - r) / diff + 2;
        else h = (r - g) / diff + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;

        // Map hue angle to a human-readable hint
        if (h < 15 || h >= 345) return 'red';
        if (h < 45) return 'orange';
        if (h < 70) return 'yellow';
        if (h < 160) return 'green';
        if (h < 200) return 'cyan';
        if (h < 260) return 'blue';
        if (h < 300) return 'purple';
        return 'pink';
    }

    // ─── Color Parsing ─────────────────────────────────────────────────

    parseColorToHex(color) {
        color = color.trim().toLowerCase();

        // Handle hex
        if (color.startsWith('#')) {
            let hex = color.slice(1);
            let rgbHex, alphaHex;

            if (hex.length === 3) {
                rgbHex = hex.split('').map((c) => c + c).join('');
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
            r = parseInt(r); g = parseInt(g); b = parseInt(b);
            if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return null;
            return r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
        }

        // Handle rgb/rgba modern (spaces, / for alpha)
        rgbMatch = color.match(
            /^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(\/\s*([\d.]+))?\s*\)$/
        );
        if (rgbMatch) {
            let [, r, g, b, , a] = rgbMatch;
            a = a || 1;
            if (parseFloat(a) !== 1) return null;
            r = parseInt(r); g = parseInt(g); b = parseInt(b);
            if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return null;
            return r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
        }

        // Handle hsl/hsla legacy (with commas)
        let hslMatch = color.match(
            /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(,\s*([\d.]+))?\s*\)$/
        );
        if (hslMatch) {
            let [, h, s, l, , a] = hslMatch;
            a = a || 1;
            if (parseFloat(a) !== 1) return null;
            h = parseInt(h) / 360; s = parseInt(s) / 100; l = parseInt(l) / 100;
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
            h = parseInt(h) / 360; s = parseInt(s) / 100; l = parseInt(l) / 100;
            return this.hslToHex(h, s, l);
        }

        return null;
    }

    hslToHex(h, s, l) {
        let r = 0, g = 0, b = 0;
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
        const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
        return toHex(r) + toHex(g) + toHex(b);
    }

    // ─── Tailwind Config Parsing ───────────────────────────────────────

    async loadTailwindColors(rootDir) {
        const configPath = path.join(rootDir, this.config.tailwindConfig);
        try {
            await fs.access(configPath);
            const configContent = await fs.readFile(configPath, 'utf8');
            this.existingConfigContent = configContent;
            this.extractColorsFromConfig(configContent);

            if (this.tailwindColors.size > 0) {
                console.log(chalk.green(`  ✓ Found ${chalk.bold(this.tailwindColors.size)} existing colors in config`));
                // Pre-populate usedNames from existing config
                for (const name of this.tailwindColors.values()) {
                    this.usedNames.add(name);
                }
            } else {
                console.log(chalk.dim('  ○ No existing colors found in config'));
            }
        } catch (error) {
            console.log(chalk.dim('  ○ No tailwind.config.js found (will create one)'));
        }
    }

    extractColorsFromConfig(configContent) {
        const cleanContent = configContent
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');

        // Match both 'name': '#hex' and 'name': 'var(--name)'
        const colorRegex = /['"`]([^'"`]+)['"`]\s*:\s*['"`](#[0-9a-fA-F]{3,8}|var\([^)]+\))['"`]/g;
        let match;
        while ((match = colorRegex.exec(cleanContent)) !== null) {
            const [, colorName, value] = match;
            if (this.reservedNames.has(colorName)) continue;

            if (value.startsWith('#')) {
                const hex = value.replace('#', '').toLowerCase();
                // Normalize 3-char hex
                const normalizedHex = hex.length === 3
                    ? hex.split('').map(c => c + c).join('')
                    : hex;
                this.tailwindColors.set(normalizedHex, colorName);
            }
            // Also track var(--name) references by reverse-looking up hex
        }

        // Try to extract nested color objects too
        this.extractNestedColors(cleanContent);
    }

    extractNestedColors(content) {
        const nestedColorRegex = /(\w+):\s*{[^}]*['"`](\d+)['"`]\s*:\s*['"`](#[0-9a-fA-F]{6})['"`]/g;
        let match;
        while ((match = nestedColorRegex.exec(content)) !== null) {
            const [, colorFamily, shade, hexValue] = match;
            const hex = hexValue.replace('#', '').toLowerCase();
            const colorName = shade === '500' ? colorFamily : `${colorFamily}-${shade}`;
            if (!this.reservedNames.has(colorName)) {
                this.tailwindColors.set(hex, colorName);
            }
        }
    }

    // ─── Smart Color Naming ────────────────────────────────────────────

    /**
     * Call color-2-name silently — suppress its internal console noise
     */
    closestColorSilent(hex) {
        const origWarn = console.warn;
        const origLog = console.log;
        const origError = console.error;
        console.warn = () => {};
        console.log = () => {};
        console.error = () => {};
        try {
            return closest(`#${hex}`);
        } finally {
            console.warn = origWarn;
            console.log = origLog;
            console.error = origError;
        }
    }

    /**
     * Generate a smart, descriptive name for a hex color.
     *
     * Strategy:
     *   1. Get base name from color-2-name library
     *   2. If name already used, try: luminance-qualifier + base (e.g., "dark-navy")
     *   3. If still used, try: luminance + hue-hint + base (e.g., "deep-blue-black")
     *   4. Last resort: append short hex fragment (e.g., "navy-0f26")
     */
    buildSmartName(hex) {
        const colorResult = this.closestColorSilent(hex);
        if (!colorResult || !colorResult.name) {
            return this.applyPrefix(`color-${hex.slice(0, 6)}`);
        }

        const baseName = colorResult.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const lumLabel = this.getLuminanceLabel(hex);
        const hueHint = this.getHueHint(hex);

        // Build candidate names in priority order
        const candidates = [];

        // 1. Base name alone (e.g., "tomato")
        candidates.push(baseName);

        // 2. Luminance + base (e.g., "dark-black", "light-grey")
        if (lumLabel) {
            candidates.push(`${lumLabel}-${baseName}`);
        }

        // 3. Hue + base (e.g., "blue-black", "green-grey")
        if (hueHint && hueHint !== baseName) {
            candidates.push(`${hueHint}-${baseName}`);
        }

        // 4. Luminance + hue + base (e.g., "deep-blue-black")
        if (lumLabel && hueHint && hueHint !== baseName) {
            candidates.push(`${lumLabel}-${hueHint}-${baseName}`);
        }

        // 5. Base + hex fragment (e.g., "black-0f26")
        const hexShort = hex.slice(0, 4);
        candidates.push(`${baseName}-${hexShort}`);

        // 6. Luminance + base + hex fragment (last resort)
        if (lumLabel) {
            candidates.push(`${lumLabel}-${baseName}-${hexShort}`);
        }

        // Pick the first unused candidate
        for (const candidate of candidates) {
            const prefixed = this.applyPrefix(candidate);
            if (!this.usedNames.has(prefixed) && !this.reservedNames.has(prefixed)) {
                return prefixed;
            }
        }

        // Ultra-fallback: full hex
        return this.applyPrefix(`${baseName}-${hex.slice(0, 6)}`);
    }

    applyPrefix(name) {
        if (this.config.prefix) {
            return `${this.config.prefix}-${name}`;
        }
        return name;
    }

    findColorName(hex) {
        const hexLower = hex.toLowerCase();

        // Already resolved
        if (this.colorMap.has(hexLower)) {
            return this.colorMap.get(hexLower);
        }

        // Priority 1: Exact match from existing Tailwind config
        if (this.tailwindColors.has(hexLower)) {
            const colorName = this.tailwindColors.get(hexLower);
            this.colorMap.set(hexLower, colorName);
            this.tailwindMatches++;
            return colorName;
        }

        // Priority 2: Smart naming from library + luminance + hue
        const smartName = this.buildSmartName(hexLower);
        this.usedNames.add(smartName);
        this.colorMap.set(hexLower, smartName);
        this.libraryMatches++;
        return smartName;
    }

    // ─── File Processing ───────────────────────────────────────────────

    async collectUniqueHex(files) {
        const hexSet = new Set();
        const pattern =
            /((?:bg|text|border|ring|shadow|from|via|to|accent|decoration|divide|outline|fill|stroke|caret|placeholder)-)\[([^\]]+)\]/g;

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                let match;
                const regex = new RegExp(pattern.source, pattern.flags);
                while ((match = regex.exec(content)) !== null) {
                    let value = match[2].replace(/_/g, ' ');
                    const hex = this.parseColorToHex(value);
                    if (hex) hexSet.add(hex);
                }
            } catch (error) {
                // Silently skip unreadable files
            }
        }
        return Array.from(hexSet);
    }

    replaceColorsInText(content) {
        let modified = false;
        let newContent = content;

        const pattern =
            /((?:bg|text|border|ring|shadow|from|via|to|accent|decoration|divide|outline|fill|stroke|caret|placeholder)-)\[([^\]]+)\]/g;

        newContent = newContent.replace(pattern, (match, prefix, value) => {
            const origValue = value;
            value = value.replace(/_/g, ' ');
            const hex = this.parseColorToHex(value);

            if (hex) {
                const hexLower = hex.toLowerCase();
                const colorName = this.colorMap.get(hexLower);

                if (colorName) {
                    this.replacements++;
                    modified = true;
                    const cleanPrefix = prefix.replace(/-$/, '');
                    return `${cleanPrefix}-${colorName}`;
                }
            }
            return match;
        });

        return { content: newContent, modified };
    }

    async processFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const { content: newContent, modified } = this.replaceColorsInText(content);

            if (modified) {
                await fs.writeFile(filePath, newContent, 'utf8');
                console.log(chalk.dim(`  ✏️  ${path.relative(process.cwd(), filePath)}`));
            }
            this.processedFiles++;
        } catch (error) {
            console.error(chalk.red(`  ✖ Error: ${filePath}: ${error.message}`));
        }
    }

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
            // Silently skip unreadable directories
        }
        return files;
    }

    // ─── CSS Variables ─────────────────────────────────────────────────

    async findCssFile(rootDir) {
        if (this.config.cssFile) {
            const fullPath = path.join(rootDir, this.config.cssFile);
            try {
                await fs.access(fullPath);
                return fullPath;
            } catch (e) { /* fallthrough */ }
        }

        const cssFiles = [
            'src/style.css', 'src/styles.css', 'src/index.css', 'src/globals.css', 'src/main.css',
            'src/app/globals.css', 'src/app/style.css',
            'src/assets/css/main.css', 'src/assets/css/style.css', 'src/assets/css/globals.css',
            'src/assets/styles/main.css', 'src/assets/style.css',
            'styles/globals.css', 'styles/index.css', 'styles/main.css',
            'app/globals.css', 'app/layout.css',
            'globals.css', 'index.css', 'style.css',
        ];

        for (const file of cssFiles) {
            const fullPath = path.join(rootDir, file);
            try {
                await fs.access(fullPath);
                return fullPath;
            } catch (e) { /* continue */ }
        }
        return null;
    }

    async updateCssVariables(rootDir, newColors) {
        const cssPath = await this.findCssFile(rootDir);

        if (!cssPath) {
            console.log(chalk.yellow('  ⚠ No CSS file found — skipping CSS variable generation'));
            console.log(chalk.dim('    Falling back to direct hex values in tailwind config'));
            return false;
        }

        const spinner = ora({ text: chalk.dim(`Adding CSS variables to ${path.relative(rootDir, cssPath)}…`), indent: 2 }).start();
        let content = await fs.readFile(cssPath, 'utf8');

        const variables = Object.entries(newColors)
            .map(([name, hex]) => `  --${name}: ${hex};`)
            .join('\n');

        // Insert into existing :root or create new
        if (content.includes(':root {')) {
            content = content.replace(':root {', `:root {\n${variables}`);
        } else if (content.includes('@tailwind base;')) {
            content = content.replace('@tailwind base;', `@tailwind base;\n\n:root {\n${variables}\n}`);
        } else if (/@import\s+['"]tailwindcss['"]/.test(content)) {
            content = content.replace(/@import\s+['"]tailwindcss['"];?/, (m) => `${m}\n\n:root {\n${variables}\n}`);
        } else if (content.includes('@theme')) {
            content = `:root {\n${variables}\n}\n\n` + content;
        } else {
            content = `:root {\n${variables}\n}\n\n` + content;
        }

        await fs.writeFile(cssPath, content, 'utf8');
        spinner.succeed(chalk.dim(`Added ${Object.keys(newColors).length} CSS variables to ${chalk.white(path.relative(rootDir, cssPath))}`));
        return true;
    }

    // ─── Tailwind Config Update ────────────────────────────────────────

    async updateTailwindConfig(rootDir) {
        const configPath = path.join(rootDir, this.config.tailwindConfig);

        // Only add colors that aren't already in the Tailwind config
        const newColors = {};
        this.colorMap.forEach((name, hex) => {
            if (!this.tailwindColors.has(hex)) {
                newColors[name] = `#${hex}`;
            }
        });

        if (Object.keys(newColors).length === 0) {
            console.log(chalk.dim('  ○ All colors already exist in config — no update needed'));
            return;
        }

        // ── CSS Variables approach ──────────────────────────────────────
        let colorsForConfig = { ...newColors };

        if (this.config.useCssVariables) {
            const cssSuccess = await this.updateCssVariables(rootDir, newColors);
            if (cssSuccess) {
                // Convert config values to var() references
                Object.keys(colorsForConfig).forEach(name => {
                    colorsForConfig[name] = `var(--${name})`;
                });
            }
            // If CSS file wasn't found, keep direct hex values
        }

        // ── Write tailwind config ──────────────────────────────────────
        const spinner = ora({ text: chalk.dim('Updating tailwind.config.js…'), indent: 2 }).start();

        try {
            await fs.access(configPath);
        } catch {
            spinner.text = chalk.dim('Creating tailwind.config.js…');
            await this.createTailwindConfig(configPath, colorsForConfig);
            spinner.succeed(chalk.dim(`Created tailwind.config.js with ${Object.keys(colorsForConfig).length} colors`));
            return;
        }

        try {
            let configContent = this.existingConfigContent || await fs.readFile(configPath, 'utf8');

            if (await this.updateExtendColors(rootDir, configContent, colorsForConfig)) {
                spinner.succeed(chalk.dim(`Added ${Object.keys(colorsForConfig).length} colors to theme.extend.colors`));
                return;
            }
            if (await this.addColorsToExtend(rootDir, configContent, colorsForConfig)) {
                spinner.succeed(chalk.dim(`Added colors to extend with ${Object.keys(colorsForConfig).length} colors`));
                return;
            }

            // Fallback: create fresh
            await this.createTailwindConfig(configPath, colorsForConfig);
            spinner.succeed(chalk.dim(`Created tailwind.config.js with ${Object.keys(colorsForConfig).length} colors`));
        } catch (error) {
            spinner.fail(chalk.red(`Error updating tailwind config: ${error.message}`));
        }
    }

    // Strategy 1: Update existing theme.extend.colors
    async updateExtendColors(rootDir, configContent, colorsObj) {
        const configPath = path.join(rootDir, this.config.tailwindConfig);
        const extendColorsRegex =
            /(theme:\s*{[\s\S]*?extend:\s*{[\s\S]*?colors:\s*{)([\s\S]*?)(\}[\s\S]*?\}[\s\S]*?\})/;
        const match = configContent.match(extendColorsRegex);
        if (match) {
            const [, prefix, existingColors, suffix] = match;
            const existingColorsObj = this.parseColorsObject(existingColors);
            const mergedColors = { ...existingColorsObj, ...colorsObj };
            const formattedColors = this.formatColorsObject(mergedColors, 8);
            const newConfigContent = configContent.replace(
                extendColorsRegex,
                `${prefix}\n${formattedColors}\n      ${suffix}`
            );
            await fs.writeFile(configPath, newConfigContent, 'utf8');
            return true;
        }
        return false;
    }

    // Strategy 2: Add colors to existing extend
    async addColorsToExtend(rootDir, configContent, colorsObj) {
        const configPath = path.join(rootDir, this.config.tailwindConfig);
        const extendRegex =
            /(theme:\s*{[\s\S]*?extend:\s*{)(?![^}]*colors)([^}]*)(\}[\s\S]*?\})/;
        const match = configContent.match(extendRegex);
        if (match) {
            const [, prefix, content, suffix] = match;
            const formattedColors = this.formatColorsObject(colorsObj, 8);
            const newConfigContent = configContent.replace(
                extendRegex,
                `${prefix}${content}\n      colors: {\n${formattedColors}\n      },${suffix}`
            );
            await fs.writeFile(configPath, newConfigContent, 'utf8');
            return true;
        }
        return false;
    }

    parseColorsObject(colorsString) {
        const colors = {};
        const colorRegex = /['"`]([^'"`]+)['"`]\s*:\s*['"`]([^'"`]+)['"`]/g;
        let match;
        while ((match = colorRegex.exec(colorsString)) !== null) {
            colors[match[1]] = match[2];
        }
        return colors;
    }

    formatColorsObject(colorsObj, indent = 8) {
        const spaces = ' '.repeat(indent);
        return Object.entries(colorsObj)
            .map(([key, value]) => `${spaces}'${key}': '${value}'`)
            .join(',\n');
    }

    async createTailwindConfig(configPath, colorsObj) {
        const formattedColors = this.formatColorsObject(colorsObj, 8);
        const prefixLine = this.config.prefix ? `\n  prefix: '${this.config.prefix}',` : '';
        const configContent = `/** @type {import('tailwindcss').Config} */
module.exports = {${prefixLine}
  content: [
    "./src/**/*.{js,jsx,ts,tsx,vue}",
    "./app/**/*.{js,jsx,ts,tsx,vue}",
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
}
`;
        await fs.writeFile(configPath, configContent, 'utf8');
    }

    // ─── Main Run ──────────────────────────────────────────────────────

    async run(rootDir = '.') {
        const prefixLabel = this.config.prefix ? chalk.dim(` (prefix: ${this.config.prefix})`) : '';
        const approach = this.config.useCssVariables
            ? chalk.green('CSS Variables') + chalk.dim(' → :root + var() refs in config')
            : chalk.cyan('Tailwind Config') + chalk.dim(' → direct hex values');
        console.log(chalk.dim(`  Approach: `) + approach);
        console.log(chalk.dim(`  Using color-2-name library for offline matching${prefixLabel}\n`));

        try {
            // Step 1: Load existing Tailwind colors
            await this.loadTailwindColors(rootDir);

            // Step 2: Find files
            const fileSpinner = ora({ text: chalk.dim('Scanning for files…'), indent: 2 }).start();
            const files = await this.findFiles(rootDir);
            fileSpinner.succeed(chalk.dim(`Found ${chalk.white.bold(files.length)} files to process`));

            // Step 3: Collect unique colors
            const colorSpinner = ora({ text: chalk.dim('Analyzing colors…'), indent: 2 }).start();
            const allHex = await this.collectUniqueHex(files);
            colorSpinner.succeed(chalk.dim(`Found ${chalk.white.bold(allHex.length)} unique color${allHex.length !== 1 ? 's' : ''} in files`));

            // Step 4: Resolve ALL color names upfront (ensures no collisions)
            if (allHex.length > 0) {
                const resolveSpinner = ora({ text: chalk.dim('Resolving color names…'), indent: 2 }).start();
                for (const hex of allHex) {
                    this.findColorName(hex);
                }
                const newCount = this.colorMap.size - this.tailwindMatches;
                resolveSpinner.succeed(chalk.dim(`Resolved ${chalk.white.bold(this.colorMap.size)} colors (${chalk.cyan(this.tailwindMatches)} from config, ${chalk.magenta(newCount)} new)`));
            }

            // Step 5: Process files
            if (allHex.length > 0) {
                for (const file of files) {
                    await this.processFile(file);
                }
            } else {
                console.log(chalk.dim('  ○ No arbitrary color values found'));
            }

            // Step 6: Update Tailwind config
            if (this.colorMap.size > 0) {
                console.log('');
                await this.updateTailwindConfig(rootDir);
            }

            // Step 7: Results
            console.log('');
            console.log(chalk.bold('  📊 Color Results'));
            console.log(chalk.dim('  ─────────────────────────'));
            console.log(`  ${chalk.dim('Files processed:')}     ${chalk.white.bold(this.processedFiles)}`);
            console.log(`  ${chalk.dim('Replacements:')}        ${chalk.white.bold(this.replacements)}`);
            console.log(`  ${chalk.dim('Config matches:')}      ${chalk.cyan.bold(this.tailwindMatches)}`);
            console.log(`  ${chalk.dim('Library matches:')}     ${chalk.magenta.bold(this.libraryMatches)}`);
            console.log(`  ${chalk.dim('Unique colors:')}       ${chalk.white.bold(this.colorMap.size)}`);

            if (this.colorMap.size > 0) {
                console.log('');
                console.log(chalk.dim('  Color map:'));
                let count = 0;
                for (const [hex, name] of this.colorMap) {
                    if (count < 15) {
                        const source = this.tailwindColors.has(hex)
                            ? chalk.cyan('config')
                            : chalk.magenta('library');
                        const swatch = chalk.hex(`#${hex}`)('██');
                        console.log(`    ${swatch} ${chalk.dim(`#${hex}`)} → ${chalk.white.bold(name)} ${chalk.dim(`(${source})`)}`);
                        count++;
                    }
                }
                if (this.colorMap.size > 15) {
                    console.log(chalk.dim(`    … and ${this.colorMap.size - 15} more`));
                }
            }
        } catch (error) {
            console.error(chalk.red(`\n  ✖ Error: ${error.message}`));
            process.exit(1);
        }
    }
}

export default ColorReplacer;