import fs from 'fs/promises';
import path from 'path';
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
    units: ['px', 'rem', 'em', '%', 'vh', 'vw', 'vmin', 'vmax', 'calc'],
    unitPrefixes: {
        px: 'p',
        rem: 'r',
        em: 'e',
        '%': 'pc',
        vh: 'vh',
        vw: 'vw',
        vmin: 'vm',
        vmax: 'vx',
        calc: 'calc',
    },
    categories: {
        width: ['w', 'min-w', 'max-w'],
        height: ['h', 'min-h', 'max-h'],
        spacing: [
            'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my',
            'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py', 'gap',
        ],
        fontSize: ['text'],
        lineHeight: ['leading'],
        letterSpacing: ['tracking'],
        borderWidth: ['border', 'border-t', 'border-r', 'border-b', 'border-l'],
        borderRadius: ['rounded', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l', 'rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br'],
        scale: ['scale', 'scale-x', 'scale-y'],
        translate: ['translate-x', 'translate-y'],
        rotate: ['rotate'],
    },
    colors: [
        'bg', 'text', 'border', 'ring', 'ring-offset', 'shadow', 'fill', 'stroke',
    ],
    prefix: undefined,
};

class ColorReplacer {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.colorValues = new Map();
        this.colorReplacements = 0;
    }

    findColorName(value) {
        const normalizedValue = value.trim();
        if (this.colorValues.has(normalizedValue)) {
            return this.colorValues.get(normalizedValue);
        }
        const name = this.generateColorName(normalizedValue);
        this.colorValues.set(normalizedValue, name);
        return name;
    }

    generateColorName(value) {
        if (value.match(/^#[0-9a-fA-F]{3,8}$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/)) {
            const cleanValue = value
                .replace(/^#/, '')
                .replace(/[()]/g, '-')
                .replace(/[\s,]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            return `color-${cleanValue}`;
        }
        return value.toLowerCase().replace(/\s+/g, '-');
    }

    replaceColorsInText(content) {
        let modified = false;
        let newContent = content;
        const prefixedColors = this.config.prefix
            ? this.config.colors.map(c => `${this.config.prefix}-${c}`)
            : this.config.colors;

        for (const colorUtility of prefixedColors) {
            const regex = new RegExp(`(\\b${this.escapeRegex(colorUtility)}-)\\[([^\\]]+)\\]`, 'g');
            newContent = newContent.replace(regex, (match, utility, value) => {
                if (value.match(/^#[0-9a-fA-F]+$|^rgb\(|^rgba\(|^hsl\(|^hsla\(|^(red|green|blue|yellow|purple|pink|indigo|gray|black|white)$/i)) {
                    const name = this.findColorName(value);
                    this.colorReplacements++;
                    modified = true;
                    return `${utility}${name}`;
                }
                return match;
            });
        }
        return { content: newContent, modified };
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    getColorConfig() {
        const colors = {};
        for (const [value, name] of this.colorValues) {
            colors[name] = value;
        }
        return colors;
    }
}

class ArbitraryValueReplacer {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.usedValues = new Map();
        this.tailwindValues = new Map();
        this.processedFiles = 0;
        this.replacements = 0;
        this.tailwindMatches = 0;
        this.generatedNames = 0;
        this.nameCounter = new Map();
        this.existingConfig = null;
        this.parsedConfig = null;
        this.colorReplacer = new ColorReplacer(this.config);
    }

    getPrefixedUtility(utility) {
        return this.config.prefix ? `${this.config.prefix}-${utility}` : utility;
    }

    getPrefixedCategories() {
        if (!this.config.prefix) {
            return this.config.categories;
        }
        const prefixedCategories = {};
        for (const [category, utilities] of Object.entries(this.config.categories)) {
            prefixedCategories[category] = utilities.map(utility =>
                this.getPrefixedUtility(utility)
            );
        }
        return prefixedCategories;
    }

    async loadTailwindValues(rootDir) {
        const configPath = path.join(rootDir, this.config.tailwindConfig);
        try {
            await fs.access(configPath);
            const configContent = await fs.readFile(configPath, 'utf8');
            this.existingConfig = configContent;
            this.parsedConfig = this.parseConfigToObject(configContent);
            this.extractValuesFromParsedConfig();

            if (this.tailwindValues.size > 0) {
                let totalValues = 0;
                for (const [, values] of this.tailwindValues) {
                    totalValues += Object.keys(values).length;
                }
                console.log(chalk.green(`  ✓ Found ${chalk.bold(this.tailwindValues.size)} categories with ${chalk.bold(totalValues)} values in config`));
            } else {
                console.log(chalk.dim('  ○ No existing values found in config'));
            }
        } catch (error) {
            console.log(chalk.dim('  ○ No tailwind.config.js found (will create one)'));
            this.parsedConfig = {
                content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
                theme: { extend: {} },
                plugins: [],
            };
            if (this.config.prefix) {
                this.parsedConfig.prefix = this.config.prefix;
            }
        }
    }

    parseConfigToObject(configContent) {
        try {
            let cleanContent = configContent
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '')
                .replace(/module\.exports\s*=\s*/, '')
                .replace(/export\s+default\s+/, '')
                .trim();
            if (cleanContent.endsWith(';')) {
                cleanContent = cleanContent.slice(0, -1);
            }
            return this.safeEvalConfig(cleanContent);
        } catch (error) {
            const newConfig = {
                content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
                theme: { extend: {} },
                plugins: [],
            };
            if (this.config.prefix) {
                newConfig.prefix = this.config.prefix;
            }
            return newConfig;
        }
    }

    safeEvalConfig(configString) {
        try {
            const func = new Function('return ' + configString);
            return func();
        } catch (error) {
            return this.regexParseConfig(configString);
        }
    }

    regexParseConfig(configString) {
        const config = {
            content: [],
            theme: { extend: {} },
            plugins: [],
        };
        const prefixMatch = configString.match(/prefix\s*:\s*['"`]([^'"`]+)['"`]/);
        if (prefixMatch) {
            config.prefix = prefixMatch[1];
        }
        const contentMatch = configString.match(/content\s*:\s*\[([\s\S]*?)\]/);
        if (contentMatch) {
            config.content = contentMatch[1].split(',').map(item =>
                item.trim().replace(/['"]/g, '')
            ).filter(item => item);
        }
        const themeExtendMatch = configString.match(/theme\s*:\s*\{[\s\S]*?extend\s*:\s*\{([\s\S]*?)\}[\s\S]*?\}/);
        if (themeExtendMatch) {
            config.theme.extend = this.parseExtendObject(themeExtendMatch[1]);
        }
        if (!config.prefix && this.config.prefix) {
            config.prefix = this.config.prefix;
        }
        return config;
    }

    parseExtendObject(extendString) {
        const extend = {};
        const categories = this.splitIntoCategories(extendString);
        for (const [category, content] of categories) {
            extend[category] = this.parseObjectValues(content);
        }
        return extend;
    }

    splitIntoCategories(content) {
        const categories = [];
        const lines = content.split('\n');
        let currentCategory = null;
        let braceCount = 0;
        let categoryContent = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;

            const categoryMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\{/);
            if (categoryMatch && braceCount === 0) {
                if (currentCategory && categoryContent.length > 0) {
                    categories.push([currentCategory, categoryContent.join('\n')]);
                }
                currentCategory = categoryMatch[1];
                categoryContent = [];
                braceCount = 1;
                continue;
            }

            if (currentCategory) {
                const openBraces = (line.match(/\{/g) || []).length;
                const closeBraces = (line.match(/\}/g) || []).length;
                braceCount += openBraces - closeBraces;
                if (braceCount > 0) {
                    categoryContent.push(line);
                } else {
                    categories.push([currentCategory, categoryContent.join('\n')]);
                    currentCategory = null;
                    categoryContent = [];
                }
            }
        }

        if (currentCategory && categoryContent.length > 0) {
            categories.push([currentCategory, categoryContent.join('\n')]);
        }
        return categories;
    }

    parseObjectValues(content) {
        const values = {};
        const regex = /['"`]?([^'"`:\s,{}]+)['"`]?\s*:\s*['"`]([^'"`]+)['"`]/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const [, name, value] = match;
            values[name.trim()] = value.trim();
        }
        return values;
    }

    extractValuesFromParsedConfig() {
        if (!this.parsedConfig?.theme?.extend) return;
        const extend = this.parsedConfig.theme.extend;
        for (const [category, values] of Object.entries(extend)) {
            if (typeof values === 'object' && values !== null) {
                const valueMap = {};
                for (const [name, value] of Object.entries(values)) {
                    if (typeof value === 'string') {
                        valueMap[value] = name;
                    }
                }
                if (Object.keys(valueMap).length > 0) {
                    this.tailwindValues.set(category, valueMap);
                }
            }
        }
    }

    findValueName(category, value) {
        const normalizedValue = value.replace(/\s+/g, ' ').trim();

        if (this.tailwindValues.has(category)) {
            const categoryValues = this.tailwindValues.get(category);
            if (categoryValues[normalizedValue]) {
                this.tailwindMatches++;
                return categoryValues[normalizedValue];
            }
        }

        const categoryUsedValues = this.usedValues.get(category) || {};
        if (categoryUsedValues[normalizedValue]) {
            return categoryUsedValues[normalizedValue];
        }

        const name = this.generateValueName(category, normalizedValue);
        this.generatedNames++;
        if (!this.usedValues.has(category)) {
            this.usedValues.set(category, {});
        }
        this.usedValues.get(category)[normalizedValue] = name;
        return name;
    }

    generateValueName(category, value) {
        // Common percentage shortcuts
        if (value === '100%') return 'full';
        if (value === '50%') return '1/2';
        if (value === '33.333333%' || value === '33.33%') return '1/3';
        if (value === '66.666667%' || value === '66.67%') return '2/3';
        if (value === '25%') return '1/4';
        if (value === '75%') return '3/4';
        if (value === '20%') return '1/5';
        if (value === '40%') return '2/5';
        if (value === '60%') return '3/5';
        if (value === '80%') return '4/5';

        const unitMatch = value.match(/^(-?\d*\.?\d+)([a-z%]+)$/i) || value.match(/^(calc\(.+\))$/);
        if (!unitMatch) {
            return this.sanitizeName(value);
        }

        let number, unit;
        if (value.startsWith('calc(')) {
            return this.handleCalcValue(value);
        } else {
            [, number, unit] = unitMatch;
        }

        const numValue = parseFloat(number);
        const prefix = this.config.unitPrefixes[unit] || unit;
        let name;

        switch (unit) {
            case 'px':
                name = `${prefix}-${Math.round(numValue)}`;
                break;
            case 'rem':
                if (numValue % 1 === 0) {
                    name = `${prefix}-${numValue}`;
                } else {
                    const decimal = (numValue % 1).toFixed(2);
                    if (decimal === '0.25') name = `${prefix}-${Math.floor(numValue)}-25`;
                    else if (decimal === '0.50') name = `${prefix}-${Math.floor(numValue)}-5`;
                    else if (decimal === '0.75') name = `${prefix}-${Math.floor(numValue)}-75`;
                    else name = `${prefix}-${numValue.toString().replace('.', '-')}`;
                }
                break;
            case 'em':
                name = `${prefix}-${numValue.toString().replace('.', '-')}`;
                break;
            case '%':
                name = `${prefix}-${Math.round(numValue)}`;
                break;
            case 'vh':
            case 'vw':
                name = `${unit}-${Math.round(numValue)}`;
                break;
            default:
                name = `${numValue}${unit}`.replace(/[^a-z0-9-]/gi, '-');
        }

        return this.ensureUniqueName(category, this.sanitizeName(name));
    }

    handleCalcValue(value) {
        let calcExpr = value.replace('calc(', '').replace(')', '');
        calcExpr = calcExpr
            .replace(/\s*\+\s*/g, '-plus-')
            .replace(/\s*-\s*/g, '-minus-')
            .replace(/\s*\*\s*/g, '-times-')
            .replace(/\s*\/\s*/g, '-div-')
            .replace(/\(/g, '-')
            .replace(/\)/g, '-')
            .replace(/var\(--[\w-]+\)/g, 'var')
            .replace(/theme\([\w.-]+\)/g, 'theme')
            .replace(/[^a-z0-9-]/gi, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        return `calc-${calcExpr}`;
    }

    sanitizeName(name) {
        return name
            .replace(/[^a-z0-9-.]/gi, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    ensureUniqueName(category, baseName) {
        const existingValues = this.tailwindValues.get(category) || {};
        const existingNames = new Set(Object.values(existingValues));
        const usedValues = this.usedValues.get(category) || {};
        const usedNames = new Set(Object.values(usedValues));
        const allUsedNames = new Set([...existingNames, ...usedNames]);

        if (!allUsedNames.has(baseName)) {
            return baseName;
        }

        let counter = 1;
        let uniqueName = `${baseName}-${counter}`;
        while (allUsedNames.has(uniqueName)) {
            counter++;
            uniqueName = `${baseName}-${counter}`;
        }
        return uniqueName;
    }

    replaceValuesInText(content) {
        let modified = false;
        let newContent = content;

        // First, handle color replacements
        const colorResult = this.colorReplacer.replaceColorsInText(newContent);
        newContent = colorResult.content;
        if (colorResult.modified) modified = true;

        // Then, handle other arbitrary value replacements
        const prefixedCategories = this.getPrefixedCategories();
        for (const [category, prefixes] of Object.entries(prefixedCategories)) {
            for (const prefix of prefixes) {
                const regex = new RegExp(`(\\b${this.escapeRegex(prefix)}-)\\[([^\\]]+)\\]`, 'g');
                newContent = newContent.replace(regex, (match, utility, value) => {
                    // Skip color values
                    if (value.match(/^#[0-9a-fA-F]+$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/)) {
                        return match;
                    }
                    if (value.match(/^(red|green|blue|yellow|purple|pink|indigo|gray|black|white)$/i)) {
                        return match;
                    }

                    const hasUnit = this.config.units.some(unit =>
                        value.includes(unit) || (unit === 'calc' && value.startsWith('calc('))
                    );

                    if (hasUnit) {
                        const name = this.findValueName(category, value);
                        this.replacements++;
                        modified = true;
                        return `${utility}${name}`;
                    }
                    return match;
                });
            }
        }

        return { content: newContent, modified };
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async processFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const { content: newContent, modified } = this.replaceValuesInText(content);

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
                        files.push(...await this.findFiles(fullPath));
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

    async updateTailwindConfig(rootDir) {
        const configPath = path.join(rootDir, this.config.tailwindConfig);
        const updatedConfig = this.mergeConfigWithNewValues();
        const configString = this.generateConfigString(updatedConfig);

        const spinner = ora({ text: chalk.dim('Updating tailwind.config.js…'), indent: 2 }).start();
        try {
            await fs.writeFile(configPath, configString, 'utf8');
            spinner.succeed(chalk.dim('Updated tailwind.config.js'));
        } catch (error) {
            spinner.fail(chalk.red(`Error updating tailwind config: ${error.message}`));
        }
    }

    mergeConfigWithNewValues() {
        const config = { ...this.parsedConfig };
        if (!config.theme) config.theme = {};
        if (!config.theme.extend) config.theme.extend = {};
        if (this.config.prefix && !config.prefix) {
            config.prefix = this.config.prefix;
        }

        // Merge non-color values
        for (const [category, values] of this.usedValues) {
            if (!config.theme.extend[category]) {
                config.theme.extend[category] = {};
            }
            const existingValues = this.tailwindValues.get(category) || {};
            for (const [value, name] of Object.entries(values)) {
                if (!existingValues[value]) {
                    config.theme.extend[category][name] = value;
                }
            }
        }

        // Merge color values
        const colorConfig = this.colorReplacer.getColorConfig();
        if (Object.keys(colorConfig).length > 0) {
            config.theme.extend.colors = { ...config.theme.extend.colors, ...colorConfig };
        }

        return config;
    }

    generateConfigString(config) {
        const indent = (level) => '  '.repeat(level);
        const formatValue = (value, level = 0) => {
            if (typeof value === 'string') {
                return `'${value}'`;
            } else if (Array.isArray(value)) {
                const items = value.map(item => `'${item}'`).join(',\n' + indent(level + 1));
                return `[\n${indent(level + 1)}${items}\n${indent(level)}]`;
            } else if (typeof value === 'object' && value !== null) {
                const entries = Object.entries(value).map(([key, val]) => {
                    const quotedKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `'${key}'`;
                    return `${indent(level + 1)}${quotedKey}: ${formatValue(val, level + 1)}`;
                });
                return `{\n${entries.join(',\n')}\n${indent(level)}}`;
            }
            return String(value);
        };

        return `/** @type {import('tailwindcss').Config} */
module.exports = ${formatValue(config).replace(/^/, '')}
`;
    }

    // ─── Main Run ──────────────────────────────────────────────────────

    async run(rootDir = '.') {
        if (this.config.prefix) {
            console.log(chalk.dim(`  Using prefix: "${this.config.prefix}"\n`));
        }

        try {
            // Step 1: Load existing values
            const configSpinner = ora({ text: chalk.dim('Loading Tailwind config…'), indent: 2 }).start();
            await this.loadTailwindValues(rootDir);
            configSpinner.stop();

            // Step 2: Find files
            const fileSpinner = ora({ text: chalk.dim('Scanning for files…'), indent: 2 }).start();
            const files = await this.findFiles(rootDir);
            fileSpinner.succeed(chalk.dim(`Found ${chalk.white.bold(files.length)} files to process`));

            // Step 3: Process files
            if (files.length > 0) {
                const processSpinner = ora({ text: chalk.dim('Replacing values…'), indent: 2 }).start();
                processSpinner.stop();

                for (const file of files) {
                    await this.processFile(file);
                }
            }

            // Step 4: Update config
            if (this.usedValues.size > 0 || this.colorReplacer.colorValues.size > 0) {
                console.log('');
                await this.updateTailwindConfig(rootDir);
            }

            // Step 5: Results
            const totalReplacements = this.replacements + this.colorReplacer.colorReplacements;
            const totalUnique = Array.from(this.usedValues.values())
                .reduce((sum, vals) => sum + Object.keys(vals).length, 0) + this.colorReplacer.colorValues.size;

            console.log('');
            console.log(chalk.bold('  📊 Unit Results'));
            console.log(chalk.dim('  ─────────────────────────'));
            console.log(`  ${chalk.dim('Files processed:')}     ${chalk.white.bold(this.processedFiles)}`);
            console.log(`  ${chalk.dim('Replacements:')}        ${chalk.white.bold(totalReplacements)}`);
            console.log(`  ${chalk.dim('Config matches:')}      ${chalk.cyan.bold(this.tailwindMatches)}`);
            console.log(`  ${chalk.dim('Generated names:')}     ${chalk.magenta.bold(this.generatedNames + this.colorReplacer.colorValues.size)}`);
            console.log(`  ${chalk.dim('Unique values:')}       ${chalk.white.bold(totalUnique)}`);

            if (totalReplacements > 0) {
                console.log('');
                console.log(chalk.dim('  Replacements made:'));
                for (const [category, values] of this.usedValues) {
                    console.log(chalk.dim(`    ${chalk.white(category)}:`));
                    for (const [value, name] of Object.entries(values)) {
                        const prefixedName = this.config.prefix ? `${this.config.prefix}-${name}` : name;
                        console.log(chalk.dim(`      [${value}] → ${chalk.white(prefixedName)}`));
                    }
                }
                if (this.colorReplacer.colorValues.size > 0) {
                    console.log(chalk.dim(`    ${chalk.white('colors')}:`));
                    for (const [value, name] of this.colorReplacer.colorValues) {
                        const prefixedName = this.config.prefix ? `${this.config.prefix}-${name}` : name;
                        console.log(chalk.dim(`      [${value}] → ${chalk.white(prefixedName)}`));
                    }
                }
            }
        } catch (error) {
            console.error(chalk.red(`\n  ✖ Error: ${error.message}`));
            process.exit(1);
        }
    }
}

export default ArbitraryValueReplacer;