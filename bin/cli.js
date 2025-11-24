#!/usr/bin/env node

import inquirer from 'inquirer';
import { readFileSync, existsSync } from 'fs';
import ColorReplacer from '../lib/color.js';
import ArbitraryValueReplacer from '../lib/units.js';

const rootDir = process.argv[2] || '.';

async function main() {
  console.log('🎨 Tailwind CSS Cleaner');
  console.log('=======================\n');

  // Question 1: Choose what to process
  const { processType } = await inquirer.prompt({
    type: 'list',
    name: 'processType',
    message: 'What would you like to process?',
    choices: [
      { name: 'Colors only', value: 'colors' },
      { name: 'Units only', value: 'units' },
      { name: 'Both colors and units', value: 'both' }
    ]
  });

  // Question 2: Ask about prefix
  const { usePrefix } = await inquirer.prompt({
    type: 'confirm',
    name: 'usePrefix',
    message: 'Would you like to add a prefix to the new values?',
    default: false
  });

  let prefix = '';
  if (usePrefix) {
    const prefixChoices = [];
    let projectName = '';

    // Try to get project name from package.json
    try {
      if (existsSync(`${rootDir}/package.json`)) {
        const packageJson = JSON.parse(readFileSync(`${rootDir}/package.json`, 'utf-8'));
        projectName = packageJson.name || '';
        if (projectName) {
          prefixChoices.push({
            name: `Use project name (${projectName})`,
            value: 'project'
          });
        }
      }
    } catch (e) {
      // Ignore errors
    }

    prefixChoices.push({
      name: 'Custom prefix',
      value: 'custom'
    });

    const { prefixType } = await inquirer.prompt({
      type: 'list',
      name: 'prefixType',
      message: 'Choose prefix type:',
      choices: prefixChoices,
      when: () => prefixChoices.length > 1
    });

    if (prefixType === 'project' || (prefixChoices.length === 1 && projectName)) {
      prefix = projectName;
    } else {
      const { customPrefix } = await inquirer.prompt({
        type: 'input',
        name: 'customPrefix',
        message: 'Enter your custom prefix:',
        validate: (input) => {
          if (input.includes(' ')) {
            return 'Prefix cannot contain spaces';
          }
          if (!input.match(/^[a-z0-9-]+$/)) {
            return 'Prefix should be lowercase letters, numbers, or hyphens only';
          }
          return true;
        },
        filter: (input) => input.toLowerCase().trim()
      });
      prefix = customPrefix;
    }
  }

  // Question 3: Ask about CSS variables
  const { useCssVariables } = await inquirer.prompt({
    type: 'confirm',
    name: 'useCssVariables',
    message: 'Would you like to use CSS variables for theming?',
    default: false
  });

  // Create config object to pass to replacers
  const config = {
    prefix: prefix || undefined, // undefined will be treated as no prefix
    useCssVariables
  };

  try {
    if (processType === 'colors' || processType === 'both') {
      console.log('\n🎨 Processing Tailwind Colors...');
      console.log('========================\n');
      const colorReplacer = new ColorReplacer(config);
      await colorReplacer.run(rootDir);
    }

    if (processType === 'units' || processType === 'both') {
      console.log('\n📏 Processing Tailwind Arbitrary Values...');
      console.log('===================================\n');
      const arbitraryValueReplacer = new ArbitraryValueReplacer(config);
      await arbitraryValueReplacer.run(rootDir);
    }

    console.log('\n✅ Processing completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\n❌ Unexpected error: ${error.message}`);
  process.exit(1);
});
