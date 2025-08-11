#!/usr/bin/env node

import ColorReplacer from '../lib/index.js';
const replacer = new ColorReplacer();
const rootDir = process.argv[2] || '.';

console.log('🎨 Tailwind Color Cleaner');
console.log('========================\n');

replacer.run(rootDir).catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
