import fs from 'fs/promises';
import path from 'path';
import { closest } from 'color-2-name';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
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

    applyPrefix(name) {
        return this.config.prefix ? `${this.config.prefix}-${name}` : name;
    }

    /**
     * Get a broad color family name based on hue, saturation, and luminance.
     * Groups similar colors together (e.g., all blues, all greens) instead
     * of using the exact library color name.
     */
    getHueGroup(hex) {
        const { r, g, b } = this.hexToRgb(hex);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        const lum = this.getLuminance(hex);
        const saturation = max === 0 ? 0 : diff / max;

        // Achromatic (grey/black/white)
        if (diff < 15 || saturation < 0.08) {
            if (lum > 0.85) return 'white';
            if (lum > 0.5) return 'grey-light';
            if (lum > 0.15) return 'grey';
            return 'black';
        }

        // Calculate hue
        let h;
        if (max === r) h = ((g - b) / diff) % 6;
        else if (max === g) h = (b - r) / diff + 2;
        else h = (r - g) / diff + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;

        // Map hue ranges to broad family names
        if (h < 15 || h >= 345) return 'red';
        if (h < 35) return 'orange';
        if (h < 55) return 'amber';
        if (h < 75) return 'yellow';
        if (h < 100) return 'lime';
        if (h < 155) return 'green';
        if (h < 175) return 'teal';
        if (h < 200) return 'cyan';
        if (h < 240) return 'blue';
        if (h < 270) return 'indigo';
        if (h < 300) return 'purple';
        if (h < 330) return 'pink';
        return 'rose';
    }

    resolveColorsBatch(allHex) {
        const newHexes = [];
        for (const hex of allHex) {
            const hexLower = hex.toLowerCase();
            if (this.colorMap.has(hexLower)) continue;
            
            if (this.tailwindColors.has(hexLower)) {
                const colorName = this.tailwindColors.get(hexLower);
                this.colorMap.set(hexLower, colorName);
                this.tailwindMatches++;
            } else {
                newHexes.push(hexLower);
            }
        }

        if (newHexes.length === 0) return;

        // Group new colors by hue-based color family
        this.colorGroups = {};
        for (const hex of newHexes) {
            const groupName = this.getHueGroup(hex);
            if (!this.colorGroups[groupName]) this.colorGroups[groupName] = [];
            this.colorGroups[groupName].push(hex);
        }

        // Auto-assign shade names to each group
        for (const [baseName, hexes] of Object.entries(this.colorGroups)) {
            this.assignShadesToGroup(baseName, hexes);
        }
    }

    getContinuousShade(lum) {
        const points = [
            { shade: 0, lum: 1.0 },
            { shade: 50, lum: 0.96 },
            { shade: 100, lum: 0.90 },
            { shade: 200, lum: 0.80 },
            { shade: 300, lum: 0.65 },
            { shade: 400, lum: 0.50 },
            { shade: 500, lum: 0.35 },
            { shade: 600, lum: 0.25 },
            { shade: 700, lum: 0.15 },
            { shade: 800, lum: 0.10 },
            { shade: 900, lum: 0.05 },
            { shade: 950, lum: 0.02 },
            { shade: 1000, lum: 0.00 }
        ];
        
        for (let i = 0; i < points.length - 1; i++) {
            if (lum <= points[i].lum && lum >= points[i+1].lum) {
                const rangeLum = points[i].lum - points[i+1].lum;
                const rangeShade = points[i+1].shade - points[i].shade;
                const fraction = (points[i].lum - lum) / rangeLum;
                return points[i].shade + fraction * rangeShade;
            }
        }
        return lum > 0.5 ? 0 : 1000;
    }

    assignShadesToGroup(groupName, hexes) {
        // Sort from lightest to darkest
        hexes.sort((a, b) => this.getLuminance(b) - this.getLuminance(a));
        
        let lastShade = -1;
        
        for (const hex of hexes) {
            const lum = this.getLuminance(hex);
            let rawShade = this.getContinuousShade(lum);
            
            let shade = Math.max(50, Math.round(rawShade / 50) * 50);
            
            // Ensure strictly increasing shades
            if (shade <= lastShade) {
                shade = lastShade + 50;
            }
            
            lastShade = shade;
            
            let finalName = this.applyPrefix(`${groupName}-${shade}`);
            
            let uniqueName = finalName;
            let counter = 1;
            while (this.usedNames.has(uniqueName) || this.reservedNames.has(uniqueName)) {
                uniqueName = this.applyPrefix(`${groupName}-${shade + (counter * 10)}`);
                counter++;
            }
            
            this.usedNames.add(uniqueName);
            this.colorMap.set(hex, uniqueName);
            this.libraryMatches++;
        }
    }

    // ─── Rename Prompt Helper ─────────────────────────────────────────

    async promptRenameColors(hexList) {
        console.log(chalk.dim('\n  Enter a new name or press Enter to keep the current name.'));
        console.log(chalk.dim('  (Use lowercase letters, numbers, and hyphens only)\n'));
        
        for (const hex of hexList) {
            const currentName = this.colorMap.get(hex);
            const isExisting = this.tailwindColors.has(hex);
            const source = isExisting ? chalk.dim('(Existing)') : chalk.green('(New)');
            const swatch = chalk.hex(`#${hex}`)('██');
            
            const { newName } = await inquirer.prompt({
                type: 'input',
                name: 'newName',
                message: `${swatch} ${chalk.dim(`#${hex}`)} ${source} ${chalk.dim('Current:')} ${chalk.yellow(currentName)} ${chalk.cyan('→')}`,
                default: currentName,
                validate: (input) => {
                    if (!input.trim()) return 'Name cannot be empty';
                    if (input.includes(' ')) return 'Name cannot contain spaces';
                    if (!input.match(/^[a-z0-9-]+$/)) return 'Use lowercase letters, numbers, or hyphens only';
                    return true;
                },
                filter: (input) => input.toLowerCase().trim()
            });

            if (newName !== currentName) {
                this.colorMap.set(hex, newName);
                this.usedNames.add(newName);
                if (isExisting) {
                    this.renamedColors.set(currentName, newName);
                }
            }
        }
        console.log(chalk.green('  ✓ Color names updated.\n'));
    }

    // ─── Auto-Shade Flow ──────────────────────────────────────────────

    async autoShadeFlow() {
        // Build groups from ALL colors (new + existing)
        if (!this.colorGroups) this.colorGroups = {};

        // Add existing colors to groups based on hue
        for (const [hex, currentName] of this.tailwindColors.entries()) {
            // Check if this hex is already in a new-color group
            let alreadyGrouped = false;
            for (const hexes of Object.values(this.colorGroups)) {
                if (hexes.includes(hex)) { alreadyGrouped = true; break; }
            }
            if (alreadyGrouped) continue;

            // Group existing colors by hue-based color family
            const groupName = this.getHueGroup(hex);
            if (!this.colorGroups[groupName]) this.colorGroups[groupName] = [];
            this.colorGroups[groupName].push(hex);
        }

        if (Object.keys(this.colorGroups).length === 0) {
            console.log(chalk.dim('  ○ No color groups found.'));
            return;
        }

        // Show current groups
        console.log(chalk.bold('\n  📦 Color Groups'));
        console.log(chalk.dim('  ─────────────────────────────────────────────'));
        
        const groupNames = Object.keys(this.colorGroups);
        for (const groupName of groupNames) {
            const hexes = this.colorGroups[groupName];
            const sortedHexes = [...hexes].sort((a, b) => this.getLuminance(b) - this.getLuminance(a));
            const swatches = sortedHexes.map(h => chalk.hex(`#${h}`)('██')).join(' ');
            const existingCount = hexes.filter(h => this.tailwindColors.has(h)).length;
            const newCount = hexes.length - existingCount;
            const countLabel = [];
            if (existingCount > 0) countLabel.push(chalk.dim(`${existingCount} existing`));
            if (newCount > 0) countLabel.push(chalk.green(`${newCount} new`));
            console.log(`    ${chalk.white.bold(groupName)} ${chalk.dim('(')}${countLabel.join(chalk.dim(', '))}${chalk.dim(')')} ${swatches}`);
        }

        console.log('');

        // Step 1: Name each group
        console.log(chalk.dim('  Name each color family. Shades (50–950) are auto-assigned.\n'));

        const groupRenames = {}; // oldGroupName → newGroupName
        for (const groupName of groupNames) {
            const hexes = this.colorGroups[groupName];
            const sortedHexes = [...hexes].sort((a, b) => this.getLuminance(b) - this.getLuminance(a));
            const swatches = sortedHexes.map(h => chalk.hex(`#${h}`)('██')).join(' ');

            const { newGroupName } = await inquirer.prompt({
                type: 'input',
                name: 'newGroupName',
                message: `${swatches} ${chalk.dim(`(${hexes.length})`)} ${chalk.dim('Group:')} ${chalk.yellow(groupName)} ${chalk.cyan('→')}`,
                default: groupName,
                validate: (input) => {
                    if (!input.trim()) return 'Name cannot be empty';
                    if (input.includes(' ')) return 'Name cannot contain spaces';
                    if (!input.match(/^[a-z0-9-]+$/)) return 'Use lowercase letters, numbers, or hyphens only';
                    return true;
                },
                filter: (input) => input.toLowerCase().trim()
            });

            groupRenames[groupName] = newGroupName;
        }

        // Rebuild groups with new names and merge groups with the same new name
        const mergedGroups = {};
        for (const [oldName, newName] of Object.entries(groupRenames)) {
            if (!mergedGroups[newName]) mergedGroups[newName] = [];
            mergedGroups[newName].push(...this.colorGroups[oldName]);
        }

        // Show preview sorted by group and shade
        console.log(chalk.bold('\n  🎨 Shade Preview'));
        console.log(chalk.dim('  ─────────────────────────────────────────────'));

        // Save old names for existing colors to track renames
        const existingOldNames = new Map();
        for (const hexes of Object.values(mergedGroups)) {
            for (const hex of hexes) {
                if (this.tailwindColors.has(hex)) {
                    existingOldNames.set(hex, this.tailwindColors.get(hex));
                }
                const oldName = this.colorMap.get(hex);
                if (oldName) this.usedNames.delete(oldName);
                this.colorMap.delete(hex);
            }
        }
        this.libraryMatches = 0;

        // Re-assign shades with new group names
        for (const [groupName, hexes] of Object.entries(mergedGroups)) {
            this.assignShadesToGroup(groupName, hexes);
            
            // Display the group
            const sortedHexes = [...hexes].sort((a, b) => this.getLuminance(b) - this.getLuminance(a));
            console.log(`\n  ${chalk.white.bold(groupName)}`);
            for (const hex of sortedHexes) {
                const name = this.colorMap.get(hex);
                const swatch = chalk.hex(`#${hex}`)('██');
                const isExisting = existingOldNames.has(hex);
                const oldLabel = isExisting ? chalk.dim(` (was: ${existingOldNames.get(hex)})`) : '';
                console.log(`    ${swatch} ${chalk.dim(`#${hex}`)} → ${chalk.green(name)}${oldLabel}`);
            }
        }

        // Track renames for existing colors
        for (const [hex, oldName] of existingOldNames) {
            const newName = this.colorMap.get(hex);
            if (newName && newName !== oldName) {
                this.renamedColors.set(oldName, newName);
            }
        }

        this.colorGroups = mergedGroups;
        console.log('');

        // Step 2: Ask if user wants to move any colors between groups
        let keepMoving = true;
        while (keepMoving) {
            const { wantMove } = await inquirer.prompt({
                type: 'confirm',
                name: 'wantMove',
                message: chalk.cyan('Move any colors to a different group?'),
                default: false,
            });

            if (!wantMove) {
                keepMoving = false;
                break;
            }

            // Pick colors to move
            const allNewHexes = Object.values(mergedGroups).flat();
            const moveChoices = allNewHexes.map(hex => {
                const name = this.colorMap.get(hex);
                const swatch = chalk.hex(`#${hex}`)('██');
                return { name: `${swatch} ${chalk.dim(`#${hex}`)} ${chalk.yellow(name)}`, value: hex };
            });

            const { hexesToMove } = await inquirer.prompt({
                type: 'checkbox',
                name: 'hexesToMove',
                message: chalk.cyan('Select colors to move (Space to toggle, Enter to confirm):'),
                choices: moveChoices,
                loop: false,
                pageSize: 15,
            });

            if (!hexesToMove || hexesToMove.length === 0) {
                keepMoving = false;
                break;
            }

            // Pick target group
            const groupChoices = Object.keys(mergedGroups).map(g => ({ name: chalk.white(g), value: g }));
            groupChoices.push({ name: chalk.green('+ Create new group'), value: '__new__' });

            const { targetGroup } = await inquirer.prompt({
                type: 'list',
                name: 'targetGroup',
                message: chalk.cyan('Move selected colors to which group?'),
                choices: groupChoices,
            });

            let finalTarget = targetGroup;
            if (targetGroup === '__new__') {
                const { newGroup } = await inquirer.prompt({
                    type: 'input',
                    name: 'newGroup',
                    message: chalk.cyan('New group name:'),
                    validate: (input) => {
                        if (!input.trim()) return 'Name cannot be empty';
                        if (!input.match(/^[a-z0-9-]+$/)) return 'Use lowercase letters, numbers, or hyphens only';
                        return true;
                    },
                    filter: (input) => input.toLowerCase().trim()
                });
                finalTarget = newGroup;
                if (!mergedGroups[finalTarget]) mergedGroups[finalTarget] = [];
            }

            // Move colors
            for (const hex of hexesToMove) {
                // Remove from old group
                for (const [gName, gHexes] of Object.entries(mergedGroups)) {
                    const idx = gHexes.indexOf(hex);
                    if (idx !== -1) {
                        gHexes.splice(idx, 1);
                        break;
                    }
                }
                // Add to target group
                mergedGroups[finalTarget].push(hex);
            }

            // Remove empty groups
            for (const gName of Object.keys(mergedGroups)) {
                if (mergedGroups[gName].length === 0) delete mergedGroups[gName];
            }

            // Re-assign all shades
            for (const hexes of Object.values(mergedGroups)) {
                for (const hex of hexes) {
                    const oldName = this.colorMap.get(hex);
                    if (oldName) this.usedNames.delete(oldName);
                    this.colorMap.delete(hex);
                }
            }
            this.libraryMatches = 0;

            for (const [groupName, hexes] of Object.entries(mergedGroups)) {
                this.assignShadesToGroup(groupName, hexes);
            }

            // Update rename tracking for existing colors
            for (const [hex, oldName] of existingOldNames) {
                const newName = this.colorMap.get(hex);
                if (newName && newName !== oldName) {
                    this.renamedColors.set(oldName, newName);
                }
            }

            // Show updated preview
            console.log(chalk.bold('\n  🎨 Updated Shade Preview'));
            console.log(chalk.dim('  ─────────────────────────────────────────────'));
            for (const [groupName, hexes] of Object.entries(mergedGroups)) {
                const sortedHexes = [...hexes].sort((a, b) => this.getLuminance(b) - this.getLuminance(a));
                console.log(`\n  ${chalk.white.bold(groupName)}`);
                for (const hex of sortedHexes) {
                    const name = this.colorMap.get(hex);
                    const swatch = chalk.hex(`#${hex}`)('██');
                    const isExisting = existingOldNames.has(hex);
                    const oldLabel = isExisting ? chalk.dim(` (was: ${existingOldNames.get(hex)})`) : '';
                    console.log(`    ${swatch} ${chalk.dim(`#${hex}`)} → ${chalk.green(name)}${oldLabel}`);
                }
            }
            console.log('');

            this.colorGroups = mergedGroups;
        }

        console.log(chalk.green('  ✓ Auto-shade complete.\n'));
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

        // Also replace renamed existing colors if any
        if (this.renamedColors && this.renamedColors.size > 0) {
            for (const [oldName, newName] of this.renamedColors) {
                const prefixes = '(?:bg|text|border|ring|shadow|from|via|to|accent|decoration|divide|outline|fill|stroke|caret|placeholder)';
                const escapedOldName = oldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const renamePattern = new RegExp(`\\b(${prefixes}-)${escapedOldName}(?![a-zA-Z0-9-])`, 'g');
                
                newContent = newContent.replace(renamePattern, (match, prefix) => {
                    this.replacements++;
                    modified = true;
                    return `${prefix}${newName}`;
                });
            }
        }

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
        // Collect new colors and renamed colors
        const newColors = {};
        const colorsToUpdate = new Map(); // oldName -> newName
        this.colorMap.forEach((name, hex) => {
            if (!this.tailwindColors.has(hex)) {
                newColors[name] = `#${hex}`;
            } else {
                const oldName = this.tailwindColors.get(hex);
                if (oldName !== name) {
                    colorsToUpdate.set(oldName, name);
                }
            }
        });

        if (Object.keys(newColors).length === 0 && colorsToUpdate.size === 0) {
            console.log(chalk.dim('  ○ All colors already in config — no update needed'));
            return;
        }

        if (this.isTailwindV4) {
            // ── Tailwind v4: Add to @theme block in CSS ──
            await this.writeV4Theme(rootDir, newColors, colorsToUpdate);
        } else if (this.config.useCssVariables) {
            // ── Tailwind v3 + CSS variables: :root + var() in config ──
            await this.writeV3CssVariables(rootDir, newColors, colorsToUpdate);
        } else {
            // ── Tailwind v3: Direct hex in config ──
            await this.writeV3Config(rootDir, newColors, colorsToUpdate);
        }
    }

    /**
     * Tailwind v4: Add colors directly to the @theme block.
     * Format: --color-{name}: #{hex};
     * No tailwind.config.js needed.
     */
    async writeV4Theme(rootDir, newColors, colorsToUpdate) {
        const cssPath = this.cssFilePath;
        if (!cssPath) {
            console.log(chalk.red('  ✖ Could not find CSS file with @theme block'));
            return;
        }

        const spinner = ora({
            text: chalk.dim(`Updating @theme in ${path.relative(rootDir, cssPath)}…`),
            indent: 2,
        }).start();

        let content = await fs.readFile(cssPath, 'utf8');

        // Find the first @theme block
        const themeBlocks = [...content.matchAll(/@theme(?:\s+inline)?\s*{/g)];
        
        if (themeBlocks.length > 0) {
            const firstThemeStart = themeBlocks[0].index;
            let braceCount = 0;
            let themeEndPos = -1;
            for (let i = firstThemeStart; i < content.length; i++) {
                if (content[i] === '{') braceCount++;
                if (content[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        themeEndPos = i;
                        break;
                    }
                }
            }

            if (themeEndPos !== -1) {
                const themeOpenPos = content.indexOf('{', firstThemeStart);
                const themeBody = content.slice(themeOpenPos + 1, themeEndPos);

                // Extract all --color-* entries
                const colorEntryRegex = /\s*--color-([^:\s]+)\s*:\s*([^;]+);/g;
                const existingColors = {};
                let match;
                while ((match = colorEntryRegex.exec(themeBody)) !== null) {
                    existingColors[match[1].trim()] = match[2].trim();
                }

                // Extract non-color entries (keep them as-is)
                const nonColorLines = [];
                const lines = themeBody.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('--color-') || trimmed.startsWith('/*')) continue;
                    // Keep non-color CSS variables
                    if (trimmed.startsWith('--') && !trimmed.startsWith('--color-')) {
                        nonColorLines.push(line);
                    }
                }

                // Apply renames to existing colors
                if (colorsToUpdate && colorsToUpdate.size > 0) {
                    for (const [oldName, newName] of colorsToUpdate) {
                        if (existingColors[oldName]) {
                            existingColors[newName] = existingColors[oldName];
                            delete existingColors[oldName];
                        }
                    }
                }

                // Add new colors
                for (const [name, hex] of Object.entries(newColors)) {
                    existingColors[name] = hex;
                }

                // Sort all colors by group name then shade number
                const sortedColorNames = Object.keys(existingColors).sort((a, b) => {
                    const parseNameParts = (name) => {
                        const shadeMatch = name.match(/^(.+)-(\d+)$/);
                        if (shadeMatch) {
                            return { group: shadeMatch[1], shade: parseInt(shadeMatch[2]) };
                        }
                        return { group: name, shade: 0 };
                    };
                    const pa = parseNameParts(a);
                    const pb = parseNameParts(b);
                    if (pa.group !== pb.group) return pa.group.localeCompare(pb.group);
                    return pa.shade - pb.shade;
                });

                // Build the sorted color block with group comments
                const colorLines = [];
                let lastGroup = null;
                for (const name of sortedColorNames) {
                    const shadeMatch = name.match(/^(.+)-(\d+)$/);
                    const group = shadeMatch ? shadeMatch[1] : name;
                    
                    if (group !== lastGroup) {
                        if (lastGroup !== null) colorLines.push('');
                        colorLines.push(`  /* ${group} */`);
                        lastGroup = group;
                    }
                    colorLines.push(`  --color-${name}: ${existingColors[name]};`);
                }

                // Rebuild the @theme block
                const themeHeader = content.slice(firstThemeStart, themeOpenPos + 1);
                const beforeTheme = content.slice(0, firstThemeStart);
                const afterTheme = content.slice(themeEndPos + 1);

                const nonColorBlock = nonColorLines.length > 0 ? '\n' + nonColorLines.join('\n') + '\n' : '';
                const newThemeBody = `\n${colorLines.join('\n')}\n${nonColorBlock}`;

                content = `${beforeTheme}${themeHeader}${newThemeBody}}${afterTheme}`;
            }
        } else {
            // No @theme block found — build sorted entries and create one
            const sortedEntries = Object.entries(newColors).sort((a, b) => {
                const parseNameParts = (name) => {
                    const m = name.match(/^(.+)-(\d+)$/);
                    return m ? { group: m[1], shade: parseInt(m[2]) } : { group: name, shade: 0 };
                };
                const pa = parseNameParts(a[0]);
                const pb = parseNameParts(b[0]);
                if (pa.group !== pb.group) return pa.group.localeCompare(pb.group);
                return pa.shade - pb.shade;
            });

            const colorEntries = sortedEntries
                .map(([name, hex]) => `  --color-${name}: ${hex};`)
                .join('\n');

            if (content.includes("@import 'tailwindcss'")) {
                content = content.replace(
                    /@import 'tailwindcss';?/,
                    (m) => `${m}\n\n@theme inline {\n${colorEntries}\n}`
                );
            } else {
                content = `@theme inline {\n${colorEntries}\n}\n\n` + content;
            }
        }

        await fs.writeFile(cssPath, content, 'utf8');
        spinner.succeed(chalk.dim(
            `Updated ${chalk.green('@theme')} in ${chalk.white(path.relative(rootDir, cssPath))} — colors sorted by group & shade`
        ));
        console.log(chalk.dim('    (No tailwind.config.js changes needed for v4)'));
    }

    /**
     * Tailwind v3 + CSS Variables: Add hex to :root, add var() refs to config.
     */
    async writeV3CssVariables(rootDir, newColors, colorsToUpdate) {
        const cssPath = await this.findCssFile(rootDir);

        if (!cssPath) {
            console.log(chalk.yellow('  ⚠ No CSS file found — falling back to direct hex in config'));
            return this.writeV3Config(rootDir, newColors, colorsToUpdate);
        }

        // 1. Add :root variables to CSS
        const cssSpinner = ora({ text: chalk.dim('Updating CSS variables in :root…'), indent: 2 }).start();
        let cssContent = await fs.readFile(cssPath, 'utf8');
        
        if (colorsToUpdate && colorsToUpdate.size > 0) {
            for (const [oldName, newName] of colorsToUpdate) {
                const escapedOldName = oldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`(--)${escapedOldName}(\\s*:)`, 'g');
                cssContent = cssContent.replace(regex, `$1${newName}$2`);
            }
        }

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
        await this.writeTailwindConfig(rootDir, varColors, colorsToUpdate);
    }

    /**
     * Tailwind v3: Direct hex values in tailwind.config.js
     */
    async writeV3Config(rootDir, newColors, colorsToUpdate) {
        await this.writeTailwindConfig(rootDir, newColors, colorsToUpdate);
    }

    async writeTailwindConfig(rootDir, colorsObj, colorsToUpdate) {
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
                
                if (colorsToUpdate && colorsToUpdate.size > 0) {
                    for (const [oldName, newName] of colorsToUpdate) {
                        if (existingColorsObj[oldName]) {
                            existingColorsObj[newName] = existingColorsObj[oldName];
                            delete existingColorsObj[oldName];
                        }
                    }
                }

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
                this.resolveColorsBatch(allHex);
                const newCount = this.colorMap.size - this.tailwindMatches;
                resolveSpinner.succeed(chalk.dim(`Resolved ${chalk.white.bold(this.colorMap.size)} colors (${chalk.cyan(this.tailwindMatches)} existing, ${chalk.magenta(newCount)} new)`));
            }

            // Step 4.5: Prompt to rename
            // Populate colorMap with existing colors so they can be renamed as well
            for (const [hex, name] of this.tailwindColors.entries()) {
                if (!this.colorMap.has(hex)) {
                    this.colorMap.set(hex, name);
                }
            }

            const allColorEntries = Array.from(this.colorMap.entries());
            this.renamedColors = new Map();

            if (allColorEntries.length > 0) {
                // ── Show color preview table ──
                console.log('');
                console.log(chalk.bold('  🎨 Color Preview'));
                console.log(chalk.dim('  ─────────────────────────────────────────────'));

                const existingEntries = allColorEntries.filter(([hex]) => this.tailwindColors.has(hex));
                const newEntries = allColorEntries.filter(([hex]) => !this.tailwindColors.has(hex));

                if (existingEntries.length > 0) {
                    console.log(chalk.dim(`\n  Existing colors (${existingEntries.length}):`));
                    for (const [hex, name] of existingEntries) {
                        const swatch = chalk.hex(`#${hex}`)('██');
                        console.log(`    ${swatch} ${chalk.dim(`#${hex}`)} → ${chalk.white(name)}`);
                    }
                }

                if (newEntries.length > 0) {
                    console.log(chalk.dim(`\n  New colors (${newEntries.length}):`));
                    for (const [hex, name] of newEntries) {
                        const swatch = chalk.hex(`#${hex}`)('██');
                        console.log(`    ${swatch} ${chalk.dim(`#${hex}`)} → ${chalk.green(name)}`);
                    }
                }

                console.log('');

                // ── Rename options menu ──
                const { renameAction } = await inquirer.prompt({
                    type: 'list',
                    name: 'renameAction',
                    message: chalk.cyan('What would you like to do with these color names?'),
                    choices: [
                        {
                            name: `${chalk.green('✓')} Accept all names as-is ${chalk.dim('— use the auto-generated names without changes')}`,
                            value: 'accept',
                        },
                        {
                            name: `${chalk.hex('#38bdf8')('◆')} Auto-shade ${chalk.dim('— name each color family, shades (50–950) assigned automatically, reorder colors between groups')}`,
                            value: 'autoshade',
                        },
                        {
                            name: `${chalk.yellow('✎')} Select specific colors to rename ${chalk.dim('— pick from a list which ones to edit')}`,
                            value: 'select',
                        },
                        {
                            name: `${chalk.magenta('✎')} Rename all colors ${chalk.dim('— go through every color one by one')}`,
                            value: 'all',
                        },
                    ],
                });

                if (renameAction === 'autoshade') {
                    await this.autoShadeFlow();
                } else if (renameAction === 'select') {
                    // Checkbox to pick which colors to rename
                    const choices = allColorEntries.map(([hex, currentName]) => {
                        const isExisting = this.tailwindColors.has(hex);
                        const source = isExisting ? chalk.dim('(Existing)') : chalk.green('(New)');
                        const swatch = chalk.hex(`#${hex}`)('██');
                        return {
                            name: `${swatch} ${chalk.dim(`#${hex}`)} ${source} ${chalk.yellow(currentName)}`,
                            value: hex
                        };
                    });

                    const { selectedHexes } = await inquirer.prompt({
                        type: 'checkbox',
                        name: 'selectedHexes',
                        message: chalk.cyan('Select colors to rename (Space to toggle, Enter to confirm):'),
                        choices: choices,
                        loop: false,
                        pageSize: 20
                    });

                    if (selectedHexes && selectedHexes.length > 0) {
                        await this.promptRenameColors(selectedHexes);
                    }
                } else if (renameAction === 'all') {
                    // Rename every color one by one
                    const allHexes = allColorEntries.map(([hex]) => hex);
                    await this.promptRenameColors(allHexes);
                }
                // 'accept' → do nothing, keep all names as-is
            }

            // Step 5: Process files
            const shouldProcessFiles = allHex.length > 0 || (this.renamedColors && this.renamedColors.size > 0);
            if (shouldProcessFiles) {
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