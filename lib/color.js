import fs from 'fs/promises';
import path from 'path';
import { closest } from 'color-2-name';
import chalk from 'chalk';
import ora from 'ora';
import { buildExcludeList, DEFAULT_EXCLUDE_DIRS } from './excludes.js';

// Default configuration
const DEFAULT_CONFIG = {
    extensions: [
        '.jsx', '.js', '.html', '.vue', '.tsx', '.ts',
        '.css', '.scss', '.less',
    ],
    excludeDirs: DEFAULT_EXCLUDE_DIRS,
    tailwindConfig: 'tailwind.config.js',
    prefix: undefined,
    cssFile: undefined,
    useCssVariables: false,
};

/**
 * Luminance/tone qualifiers used to differentiate shades.
 */
const LUMINANCE_LABELS = [
    { max: 0.03, label: 'deepest' },
    { max: 0.06, label: 'deep' },
    { max: 0.10, label: 'darker' },
    { max: 0.15, label: 'dark' },
    { max: 0.30, label: '' },
    { max: 0.45, label: 'medium' },
    { max: 0.60, label: 'soft' },
    { max: 0.75, label: 'light' },
    { max: 0.90, label: 'lighter' },
    { max: 1.01, label: 'pale' },
];

class ColorReplacer {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.tailwindColors = new Map();   // Existing: hex → name
        this.colorMap = new Map();          // Resolved: hex → name
        this.usedNames = new Set();
        this.processedFiles = 0;
        this.replacements = 0;
        this.tailwindMatches = 0;
        this.libraryMatches = 0;
        this.isTailwindV4 = false;         // Detected from CSS

        this.reservedNames = new Set([
            'border', 'text', 'bg', 'ring', 'shadow', 'from', 'via', 'to',
            'accent', 'decoration', 'divide', 'outline', 'fill', 'stroke',
            'caret', 'placeholder', 'current', 'transparent', 'inherit',
        ]);
    }

    // ─── Hex Helpers ───────────────────────────────────────────────────

    hexToRgb(hex) {
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
        };
    }

    getLuminance(hex) {
        const { r, g, b } = this.hexToRgb(hex);
        const toLinear = (c) => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    getLuminanceLabel(hex) {
        const lum = this.getLuminance(hex);
        for (const entry of LUMINANCE_LABELS) {
            if (lum < entry.max) return entry.label;
        }
        return '';
    }

    getHueHint(hex) {
        const { r, g, b } = this.hexToRgb(hex);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        if (diff < 20) return '';

        let h;
        if (max === r) h = ((g - b) / diff) % 6;
        else if (max === g) h = (b - r) / diff + 2;
        else h = (r - g) / diff + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;

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

        if (color.startsWith('#')) {
            let hex = color.slice(1);
            let rgbHex, alphaHex;

            if (hex.length === 3) {
                rgbHex = hex.split('').map(c => c + c).join('');
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

        // rgb/rgba with commas
        let m = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([\d.]+))?\s*\)$/);
        if (m) {
            let [, r, g, b, , a] = m;
            if (a !== undefined && parseFloat(a) !== 1) return null;
            r = parseInt(r); g = parseInt(g); b = parseInt(b);
            if ([r, g, b].some(v => isNaN(v) || v < 0 || v > 255)) return null;
            return r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
        }

        // rgb/rgba with spaces
        m = color.match(/^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(\/\s*([\d.]+))?\s*\)$/);
        if (m) {
            let [, r, g, b, , a] = m;
            if (a !== undefined && parseFloat(a) !== 1) return null;
            r = parseInt(r); g = parseInt(g); b = parseInt(b);
            if ([r, g, b].some(v => isNaN(v) || v < 0 || v > 255)) return null;
            return r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
        }

        // hsl/hsla with commas
        m = color.match(/^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(,\s*([\d.]+))?\s*\)$/);
        if (m) {
            let [, h, s, l, , a] = m;
            if (a !== undefined && parseFloat(a) !== 1) return null;
            return this.hslToHex(parseInt(h) / 360, parseInt(s) / 100, parseInt(l) / 100);
        }

        // hsl/hsla with spaces
        m = color.match(/^hsla?\(\s*(\d+)\s+(\d+)%\s+(\d+)%\s*(\/\s*([\d.]+))?\s*\)$/);
        if (m) {
            let [, h, s, l, , a] = m;
            if (a !== undefined && parseFloat(a) !== 1) return null;
            return this.hslToHex(parseInt(h) / 360, parseInt(s) / 100, parseInt(l) / 100);
        }

        return null;
    }

    hslToHex(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
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

    // ─── Detect Tailwind version & load existing colors ────────────────

    async detectTailwindVersion(rootDir) {
        // Check the CSS file for @theme (Tailwind v4 indicator)
        const cssPath = await this.findCssFile(rootDir);
        if (cssPath) {
            const cssContent = await fs.readFile(cssPath, 'utf8');
            if (cssContent.includes('@theme') || cssContent.includes("@import 'tailwindcss'") || cssContent.includes('@import "tailwindcss"')) {
                this.isTailwindV4 = true;
                this.cssFilePath = cssPath;
                this.cssFileContent = cssContent;

                // Extract existing colors from @theme block
                this.extractV4ThemeColors(cssContent);

                console.log(chalk.green(`  ✓ Detected ${chalk.bold('Tailwind CSS v4')} (using @theme in CSS)`));
                console.log(chalk.dim(`    CSS: ${path.relative(rootDir, cssPath)}`));
                if (this.tailwindColors.size > 0) {
                    console.log(chalk.dim(`    Found ${this.tailwindColors.size} existing theme colors`));
                }
                return;
            }
        }

        // Fallback: check for tailwind.config.js (Tailwind v3)
        const configPath = path.join(rootDir, this.config.tailwindConfig);
        try {
            await fs.access(configPath);
            const configContent = await fs.readFile(configPath, 'utf8');
            this.existingConfigContent = configContent;
            this.extractColorsFromConfig(configContent);

            console.log(chalk.green(`  ✓ Detected ${chalk.bold('Tailwind CSS v3')} (using config file)`));
            if (this.tailwindColors.size > 0) {
                console.log(chalk.dim(`    Found ${this.tailwindColors.size} existing colors in config`));
            }
        } catch (error) {
            console.log(chalk.dim('  ○ No tailwind config found (will create one)'));
        }

        // Pre-populate usedNames from existing config
        for (const name of this.tailwindColors.values()) {
            this.usedNames.add(name);
        }
    }

    /**
     * Extract colors from Tailwind v4 @theme block.
     * Format: --color-name: #hex;
     */
    extractV4ThemeColors(cssContent) {
        // Match @theme or @theme inline blocks
        const themeRegex = /@theme(?:\s+inline)?\s*{([\s\S]*?)}/g;
        let match;
        while ((match = themeRegex.exec(cssContent)) !== null) {
            const block = match[1];
            // Match --color-* entries
            const colorVarRegex = /--color-([^:\s]+)\s*:\s*([^;]+);/g;
            let colorMatch;
            while ((colorMatch = colorVarRegex.exec(block)) !== null) {
                const name = colorMatch[1].trim();
                const value = colorMatch[2].trim();

                // If value is a direct hex, map it
                if (value.startsWith('#')) {
                    const hex = value.replace('#', '').toLowerCase();
                    const normalizedHex = hex.length === 3
                        ? hex.split('').map(c => c + c).join('')
                        : hex;
                    this.tailwindColors.set(normalizedHex, name);
                    this.usedNames.add(name);
                }
                // If value is var(--something), still track the name as used
                else {
                    this.usedNames.add(name);
                }
            }
        }
    }

    extractColorsFromConfig(configContent) {
        const cleanContent = configContent
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');

        const colorRegex = /['"`]([^'"`]+)['"`]\s*:\s*['"`](#[0-9a-fA-F]{3,8}|var\([^)]+\))['"`]/g;
        let match;
        while ((match = colorRegex.exec(cleanContent)) !== null) {
            const [, colorName, value] = match;
            if (this.reservedNames.has(colorName)) continue;
            if (value.startsWith('#')) {
                const hex = value.replace('#', '').toLowerCase();
                const normalizedHex = hex.length === 3
                    ? hex.split('').map(c => c + c).join('')
                    : hex;
                this.tailwindColors.set(normalizedHex, colorName);
            }
        }
    }

    // ─── Smart Color Naming ────────────────────────────────────────────

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

        const candidates = [];
        candidates.push(baseName);
        if (lumLabel) candidates.push(`${lumLabel}-${baseName}`);
        if (hueHint && hueHint !== baseName) candidates.push(`${hueHint}-${baseName}`);
        if (lumLabel && hueHint && hueHint !== baseName) candidates.push(`${lumLabel}-${hueHint}-${baseName}`);
        candidates.push(`${baseName}-${hex.slice(0, 4)}`);
        if (lumLabel) candidates.push(`${lumLabel}-${baseName}-${hex.slice(0, 4)}`);

        for (const candidate of candidates) {
            const prefixed = this.applyPrefix(candidate);
            if (!this.usedNames.has(prefixed) && !this.reservedNames.has(prefixed)) {
                return prefixed;
            }
        }

        return this.applyPrefix(`${baseName}-${hex.slice(0, 6)}`);
    }

    applyPrefix(name) {
        return this.config.prefix ? `${this.config.prefix}-${name}` : name;
    }

    findColorName(hex) {
        const hexLower = hex.toLowerCase();

        if (this.colorMap.has(hexLower)) return this.colorMap.get(hexLower);

        // Priority 1: Existing config/theme match
        if (this.tailwindColors.has(hexLower)) {
            const colorName = this.tailwindColors.get(hexLower);
            this.colorMap.set(hexLower, colorName);
            this.tailwindMatches++;
            return colorName;
        }

        // Priority 2: Smart naming
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
            } catch (error) { /* skip */ }
        }
        return Array.from(hexSet);
    }

    replaceColorsInText(content) {
        let modified = false;
        let newContent = content;

        const pattern =
            /((?:bg|text|border|ring|shadow|from|via|to|accent|decoration|divide|outline|fill|stroke|caret|placeholder)-)\[([^\]]+)\]/g;

        newContent = newContent.replace(pattern, (match, prefix, value) => {
            value = value.replace(/_/g, ' ');
            const hex = this.parseColorToHex(value);

            if (hex) {
                const colorName = this.colorMap.get(hex.toLowerCase());
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
                    if (this.config.extensions.includes(path.extname(entry.name))) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) { /* skip */ }
        return files;
    }

    async findCssFile(rootDir) {
        if (this.config.cssFile) {
            const fullPath = path.join(rootDir, this.config.cssFile);
            try { await fs.access(fullPath); return fullPath; } catch (e) { /* fallthrough */ }
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
            try { await fs.access(fullPath); return fullPath; } catch (e) { /* continue */ }
        }
        return null;
    }

    // ─── Write Results ─────────────────────────────────────────────────

    async writeResults(rootDir) {
        // Collect only NEW colors (not already in config/theme)
        const newColors = {};
        this.colorMap.forEach((name, hex) => {
            if (!this.tailwindColors.has(hex)) {
                newColors[name] = `#${hex}`;
            }
        });

        if (Object.keys(newColors).length === 0) {
            console.log(chalk.dim('  ○ All colors already in config — no update needed'));
            return;
        }

        if (this.isTailwindV4) {
            // ── Tailwind v4: Add to @theme block in CSS ──
            await this.writeV4Theme(rootDir, newColors);
        } else if (this.config.useCssVariables) {
            // ── Tailwind v3 + CSS variables: :root + var() in config ──
            await this.writeV3CssVariables(rootDir, newColors);
        } else {
            // ── Tailwind v3: Direct hex in config ──
            await this.writeV3Config(rootDir, newColors);
        }
    }

    /**
     * Tailwind v4: Add colors directly to the @theme block.
     * Format: --color-{name}: #{hex};
     * No tailwind.config.js needed.
     */
    async writeV4Theme(rootDir, newColors) {
        const cssPath = this.cssFilePath;
        if (!cssPath) {
            console.log(chalk.red('  ✖ Could not find CSS file with @theme block'));
            return;
        }

        const spinner = ora({
            text: chalk.dim(`Adding ${Object.keys(newColors).length} colors to @theme in ${path.relative(rootDir, cssPath)}…`),
            indent: 2,
        }).start();

        let content = await fs.readFile(cssPath, 'utf8');

        // Build the color entries for @theme
        const colorEntries = Object.entries(newColors)
            .map(([name, hex]) => `  --color-${name}: ${hex};`)
            .join('\n');

        // Find the last @theme block and insert before its closing }
        const themeBlocks = [...content.matchAll(/@theme(?:\s+inline)?\s*{/g)];

        if (themeBlocks.length > 0) {
            // Insert into the FIRST @theme block (which has the color definitions)
            const firstThemeStart = themeBlocks[0].index;
            // Find the closing } of this @theme block
            let braceCount = 0;
            let insertPos = -1;
            for (let i = firstThemeStart; i < content.length; i++) {
                if (content[i] === '{') braceCount++;
                if (content[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        insertPos = i;
                        break;
                    }
                }
            }

            if (insertPos !== -1) {
                // Insert just before the closing }
                const before = content.slice(0, insertPos);
                const after = content.slice(insertPos);
                content = `${before}\n\n  /* Colors added by tailwind-cleaner */\n${colorEntries}\n${after}`;
            }
        } else {
            // No @theme block found, create one
            if (content.includes("@import 'tailwindcss'")) {
                content = content.replace(
                    /@import 'tailwindcss';?/,
                    (m) => `${m}\n\n@theme inline {\n  /* Colors added by tailwind-cleaner */\n${colorEntries}\n}`
                );
            } else {
                content = `@theme inline {\n  /* Colors added by tailwind-cleaner */\n${colorEntries}\n}\n\n` + content;
            }
        }

        await fs.writeFile(cssPath, content, 'utf8');
        spinner.succeed(chalk.dim(
            `Added ${chalk.white.bold(Object.keys(newColors).length)} colors to ${chalk.green('@theme')} in ${chalk.white(path.relative(rootDir, cssPath))}`
        ));
        console.log(chalk.dim('    (No tailwind.config.js changes needed for v4)'));
    }

    /**
     * Tailwind v3 + CSS Variables: Add hex to :root, add var() refs to config.
     */
    async writeV3CssVariables(rootDir, newColors) {
        const cssPath = await this.findCssFile(rootDir);

        if (!cssPath) {
            console.log(chalk.yellow('  ⚠ No CSS file found — falling back to direct hex in config'));
            return this.writeV3Config(rootDir, newColors);
        }

        // 1. Add :root variables to CSS
        const cssSpinner = ora({ text: chalk.dim('Adding CSS variables to :root…'), indent: 2 }).start();
        let cssContent = await fs.readFile(cssPath, 'utf8');
        const variables = Object.entries(newColors)
            .map(([name, hex]) => `  --${name}: ${hex};`)
            .join('\n');

        if (cssContent.includes(':root {')) {
            cssContent = cssContent.replace(':root {', `:root {\n${variables}`);
        } else {
            cssContent = `:root {\n${variables}\n}\n\n` + cssContent;
        }
        await fs.writeFile(cssPath, cssContent, 'utf8');
        cssSpinner.succeed(chalk.dim(`Added ${Object.keys(newColors).length} CSS variables to ${path.relative(rootDir, cssPath)}`));

        // 2. Add var() refs to tailwind.config.js
        const varColors = {};
        Object.keys(newColors).forEach(name => {
            varColors[name] = `var(--${name})`;
        });
        await this.writeTailwindConfig(rootDir, varColors);
    }

    /**
     * Tailwind v3: Direct hex values in tailwind.config.js
     */
    async writeV3Config(rootDir, newColors) {
        await this.writeTailwindConfig(rootDir, newColors);
    }

    async writeTailwindConfig(rootDir, colorsObj) {
        const configPath = path.join(rootDir, this.config.tailwindConfig);
        const spinner = ora({ text: chalk.dim('Updating tailwind.config.js…'), indent: 2 }).start();

        try {
            await fs.access(configPath);
            const configContent = this.existingConfigContent || await fs.readFile(configPath, 'utf8');

            // Try to insert into existing extend.colors
            const extendColorsRegex =
                /(theme:\s*{[\s\S]*?extend:\s*{[\s\S]*?colors:\s*{)([\s\S]*?)(\}[\s\S]*?\}[\s\S]*?\})/;
            const match = configContent.match(extendColorsRegex);

            if (match) {
                const [, prefix, existingColors, suffix] = match;
                const existingColorsObj = this.parseColorsObject(existingColors);
                const mergedColors = { ...existingColorsObj, ...colorsObj };
                const formatted = this.formatColorsObject(mergedColors, 8);
                const newConfig = configContent.replace(extendColorsRegex, `${prefix}\n${formatted}\n      ${suffix}`);
                await fs.writeFile(configPath, newConfig, 'utf8');
                spinner.succeed(chalk.dim(`Added ${Object.keys(colorsObj).length} colors to tailwind.config.js`));
            } else {
                // Create new config
                await this.createFreshConfig(configPath, colorsObj);
                spinner.succeed(chalk.dim(`Created tailwind.config.js with ${Object.keys(colorsObj).length} colors`));
            }
        } catch {
            await this.createFreshConfig(configPath, colorsObj);
            spinner.succeed(chalk.dim(`Created tailwind.config.js with ${Object.keys(colorsObj).length} colors`));
        }
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

    async createFreshConfig(configPath, colorsObj) {
        const formatted = this.formatColorsObject(colorsObj, 8);
        const prefixLine = this.config.prefix ? `\n  prefix: '${this.config.prefix}',` : '';
        const content = `/** @type {import('tailwindcss').Config} */
module.exports = {${prefixLine}
  content: [
    "./src/**/*.{js,jsx,ts,tsx,vue}",
    "./app/**/*.{js,jsx,ts,tsx,vue}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
${formatted}
      }
    },
  },
  plugins: [],
}
`;
        await fs.writeFile(configPath, content, 'utf8');
    }

    // ─── Main Run ──────────────────────────────────────────────────────

    async run(rootDir = '.') {
        const prefixLabel = this.config.prefix ? chalk.dim(` (prefix: ${this.config.prefix})`) : '';
        console.log(chalk.dim(`  Using color-2-name library for offline matching${prefixLabel}\n`));

        try {
            // Step 1: Detect Tailwind version & load existing colors
            await this.detectTailwindVersion(rootDir);

            // Show the approach being used
            if (this.isTailwindV4) {
                console.log(chalk.dim(`  Approach: `) + chalk.green('@theme') + chalk.dim(' → colors added directly to CSS (no config file needed)'));
            } else if (this.config.useCssVariables) {
                console.log(chalk.dim(`  Approach: `) + chalk.cyan('CSS Variables') + chalk.dim(' → :root hex + var() in tailwind.config.js'));
            } else {
                console.log(chalk.dim(`  Approach: `) + chalk.yellow('Tailwind Config') + chalk.dim(' → direct hex in tailwind.config.js'));
            }

            console.log('');

            // Step 2: Find files
            const fileSpinner = ora({ text: chalk.dim('Scanning for files…'), indent: 2 }).start();
            const files = await this.findFiles(rootDir);
            fileSpinner.succeed(chalk.dim(`Found ${chalk.white.bold(files.length)} files to process`));

            // Step 3: Collect unique colors
            const colorSpinner = ora({ text: chalk.dim('Analyzing colors…'), indent: 2 }).start();
            const allHex = await this.collectUniqueHex(files);
            colorSpinner.succeed(chalk.dim(`Found ${chalk.white.bold(allHex.length)} unique color${allHex.length !== 1 ? 's' : ''}`));

            // Step 4: Pre-resolve all names
            if (allHex.length > 0) {
                const resolveSpinner = ora({ text: chalk.dim('Resolving color names…'), indent: 2 }).start();
                for (const hex of allHex) {
                    this.findColorName(hex);
                }
                const newCount = this.colorMap.size - this.tailwindMatches;
                resolveSpinner.succeed(chalk.dim(`Resolved ${chalk.white.bold(this.colorMap.size)} colors (${chalk.cyan(this.tailwindMatches)} existing, ${chalk.magenta(newCount)} new)`));
            }

            // Step 5: Process files
            if (allHex.length > 0) {
                for (const file of files) {
                    await this.processFile(file);
                }
            } else {
                console.log(chalk.dim('  ○ No arbitrary color values found'));
            }

            // Step 6: Write to config/theme
            if (this.colorMap.size > 0) {
                console.log('');
                await this.writeResults(rootDir);
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
                            ? chalk.cyan('existing')
                            : chalk.magenta('new');
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