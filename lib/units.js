import fs from 'fs/promises';
import path from 'path';
// Configuration
const CONFIG = {
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
            'm',
            'mt',
            'mr',
            'mb',
            'ml',
            'mx',
            'my',
            'p',
            'pt',
            'pr',
            'pb',
            'pl',
            'px',
            'py',
            'gap',
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
};

class ArbitraryValueReplacer {
    constructor() {
        this.usedValues = new Map();
        this.tailwindValues = new Map();
        this.processedFiles = 0;
        this.replacements = 0;
        this.tailwindMatches = 0;
        this.generatedNames = 0;
        this.nameCounter = new Map();
        this.existingConfig = null;
        this.parsedConfig = null;
    }

    async loadTailwindValues(rootDir) {
        const configPath = path.join(rootDir, CONFIG.tailwindConfig);
        try {
            await fs.access(configPath);
            console.log('📋 Loading existing values from Tailwind config...');
            const configContent = await fs.readFile(configPath, 'utf8');
            this.existingConfig = configContent;
            this.parsedConfig = this.parseConfigToObject(configContent);
            this.extractValuesFromParsedConfig();

            if (this.tailwindValues.size > 0) {
                console.log(`✅ Found ${this.tailwindValues.size} categories with values in Tailwind config`);
                let totalValues = 0;
                for (const [category, values] of this.tailwindValues) {
                    totalValues += Object.keys(values).length;
                }
                console.log(`   Total values: ${totalValues}`);
            } else {
                console.log('ℹ No existing values found in Tailwind config');
            }
        } catch (error) {
            console.log(`ℹ No tailwind.config.js found or unable to read: ${error.message}`);
            this.parsedConfig = {
                content: [
                    "./src/**/*.{js,jsx,ts,tsx}",
                    "./public/index.html"
                ],
                theme: {
                    extend: {}
                },
                plugins: []
            };
        }
    }

    parseConfigToObject(configContent) {
        try {
            // Remove comments and clean up the config
            let cleanContent = configContent
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/.*$/gm, '')
                .replace(/module\.exports\s*=\s*/, '')
                .replace(/export\s+default\s+/, '')
                .trim();

            // Remove trailing semicolon if present
            if (cleanContent.endsWith(';')) {
                cleanContent = cleanContent.slice(0, -1);
            }

            // Use a safer evaluation approach
            const config = this.safeEvalConfig(cleanContent);
            return config;
        } catch (error) {
            console.warn('⚠ Warning: Could not parse existing config, creating new structure:', error.message);
            return {
                content: [
                    "./src/**/*.{js,jsx,ts,tsx}",
                    "./public/index.html"
                ],
                theme: {
                    extend: {}
                },
                plugins: []
            };
        }
    }

    safeEvalConfig(configString) {
        // This is a simplified parser - in production, consider using a proper JS parser
        try {
            // Create a safe evaluation context
            const func = new Function('return ' + configString);
            return func();
        } catch (error) {
            // Fallback to regex parsing for basic structure
            return this.regexParseConfig(configString);
        }
    }

    regexParseConfig(configString) {
        const config = {
            content: [],
            theme: { extend: {} },
            plugins: []
        };

        // Extract content array
        const contentMatch = configString.match(/content\s*:\s*\[([\s\S]*?)\]/);
        if (contentMatch) {
            const contentItems = contentMatch[1].split(',').map(item =>
                item.trim().replace(/['"]/g, '')
            ).filter(item => item);
            config.content = contentItems;
        }

        // Extract theme.extend
        const themeExtendMatch = configString.match(/theme\s*:\s*\{[\s\S]*?extend\s*:\s*\{([\s\S]*?)\}[\s\S]*?\}/);
        if (themeExtendMatch) {
            config.theme.extend = this.parseExtendObject(themeExtendMatch[1]);
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

        // Check if value already exists in Tailwind config
        if (this.tailwindValues.has(category)) {
            const categoryValues = this.tailwindValues.get(category);
            if (categoryValues[normalizedValue]) {
                this.tailwindMatches++;
                return categoryValues[normalizedValue];
            }
        }

        // Check if we've already generated a name for this value
        const categoryUsedValues = this.usedValues.get(category) || {};
        if (categoryUsedValues[normalizedValue]) {
            return categoryUsedValues[normalizedValue];
        }

        // Generate new name
        const name = this.generateValueName(category, normalizedValue);
        this.generatedNames++;

        if (!this.usedValues.has(category)) {
            this.usedValues.set(category, {});
        }
        this.usedValues.get(category)[normalizedValue] = name;

        return name;
    }

    generateValueName(category, value) {
        // Handle common percentage values
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

        // Parse value with unit
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
        const prefix = CONFIG.unitPrefixes[unit] || unit;
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
        // Get all existing names from config and current session
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

        for (const [category, prefixes] of Object.entries(CONFIG.categories)) {
            for (const prefix of prefixes) {
                const regex = new RegExp(`(\\b${prefix}-)\\[([^\\]]+)\\]`, 'g');
                newContent = newContent.replace(regex, (match, utility, value) => {
                    // Skip color values (hex, rgb, hsl, etc.)
                    if (value.match(/^#[0-9a-fA-F]+$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/)) {
                        return match;
                    }

                    // Skip named colors
                    if (value.match(/^(red|green|blue|yellow|purple|pink|indigo|gray|black|white)$/i)) {
                        return match;
                    }

                    // Check if value has supported units
                    const hasUnit = CONFIG.units.some(unit =>
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

    async processFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const { content: newContent, modified } = this.replaceValuesInText(content);

            if (modified) {
                await fs.writeFile(filePath, newContent, 'utf8');
                console.log(`✏  Modified: ${filePath}`);
            }
            this.processedFiles++;
        } catch (error) {
            console.error(`❌ Error processing file ${filePath}: ${error.message}`);
        }
    }

    async findFiles(dir) {
        const files = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!CONFIG.excludeDirs.includes(entry.name)) {
                        files.push(...await this.findFiles(fullPath));
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (CONFIG.extensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.warn(`⚠  Warning: Cannot read directory ${dir}: ${error.message}`);
        }
        return files;
    }

    async updateTailwindConfig(rootDir) {
        const configPath = path.join(rootDir, CONFIG.tailwindConfig);

        // Merge new values with existing config
        const updatedConfig = this.mergeConfigWithNewValues();

        // Generate the formatted config string
        const configString = this.generateConfigString(updatedConfig);

        try {
            await fs.writeFile(configPath, configString, 'utf8');
            console.log(`✅ Updated tailwind.config.js`);
        } catch (error) {
            console.error(`❌ Error updating tailwind config: ${error.message}`);
        }
    }

    mergeConfigWithNewValues() {
        const config = { ...this.parsedConfig };

        // Ensure theme.extend exists
        if (!config.theme) config.theme = {};
        if (!config.theme.extend) config.theme.extend = {};

        // Merge new values with existing extend
        for (const [category, values] of this.usedValues) {
            if (!config.theme.extend[category]) {
                config.theme.extend[category] = {};
            }

            // Add only new values (ones not already in config)
            for (const [value, name] of Object.entries(values)) {
                const existingValues = this.tailwindValues.get(category) || {};
                if (!existingValues[value]) {
                    config.theme.extend[category][name] = value;
                }
            }
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

    async run(rootDir = '.') {
        console.log('🚀 Starting Tailwind Arbitrary Value Replacer...\n');

        try {
            await this.loadTailwindValues(rootDir);

            console.log('\n📂 Finding files to process...');
            const files = await this.findFiles(rootDir);
            console.log(`Found ${files.length} files to process`);

            console.log('\n🔄 Processing files...');
            for (const file of files) {
                await this.processFile(file);
            }

            if (this.usedValues.size > 0) {
                console.log('\n⚙  Updating Tailwind configuration...');
                await this.updateTailwindConfig(rootDir);
            }

            console.log('\n📊 Results:');
            console.log(`├── Files processed: ${this.processedFiles}`);
            console.log(`├── Total replacements: ${this.replacements}`);
            console.log(`├── Tailwind config matches: ${this.tailwindMatches}`);
            console.log(`├── Generated names: ${this.generatedNames}`);

            const totalUniqueValues = Array.from(this.usedValues.values())
                .reduce((sum, vals) => sum + Object.keys(vals).length, 0);
            console.log(`└── Total unique values added: ${totalUniqueValues}`);

            if (this.replacements > 0) {
                console.log('\n✨ Success! Arbitrary values have been replaced with standardized names.');
                console.log("💡 Don't forget to restart your dev server and rebuild.");

                console.log('\n📋 All replacements made:');
                for (const [category, values] of this.usedValues) {
                    console.log(`  ${category}:`);
                    for (const [value, name] of Object.entries(values)) {
                        console.log(`    [${value}] → ${name}`);
                    }
                }
            } else {
                console.log('\nℹ  No arbitrary value patterns found to replace.');
            }
        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Export the class for programmatic use
export default ArbitraryValueReplacer;
// If run directly, execute the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    const replacer = new ArbitraryValueReplacer();
    const rootDir = process.argv[2] || '.';
    console.log(
        '🎨 ArbitraryValueReplacer'
    );
    console.log(
        '===============================================================\n'
    );
    replacer.run(rootDir).catch((error) => {
        console.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}
