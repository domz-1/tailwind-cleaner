#!/usr/bin/env node

import ColorReplacer from '../lib/color.js';
import ArbitraryValueReplacer from '../lib/units.js';
const colorReplacer = new ColorReplacer();
const arbitraryValueReplacer = new ArbitraryValueReplacer();

const rootDir = process.argv[2] || '.';

console.log('🎨 Tailwind Color Cleaner');
console.log('========================\n');
colorReplacer.run(rootDir).catch((error) => {   
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
console.log('🎨 Tailwind Arbitrary Value Cleaner');
console.log('===================================\n');
arbitraryValueReplacer.run(rootDir).catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
