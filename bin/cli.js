#!/usr/bin/env node

import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import inquirer from 'inquirer';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import ColorReplacer from '../lib/color.js';
import ArbitraryValueReplacer from '../lib/units.js';
import { buildExcludeList } from '../lib/excludes.js';

const VERSION = '2.0.0';
const rootDir = process.argv[2] || '.';

// ─── Handle --help / --version flags ──────────────────────────────────────────
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${chalk.bold('tailwind-cleaner')} ${chalk.dim(`v${VERSION}`)}

${chalk.cyan('Usage:')}
  ${chalk.green('npx tailwind-cleaner')} ${chalk.dim('[directory]')}

${chalk.cyan('Options:')}
  ${chalk.yellow('--help, -h')}      Show this help message
  ${chalk.yellow('--version, -v')}   Show version number

${chalk.cyan('Examples:')}
  ${chalk.dim('$')} npx tailwind-cleaner          ${chalk.dim('# Run in current directory')}
  ${chalk.dim('$')} npx tailwind-cleaner ./src     ${chalk.dim('# Run in specific directory')}

${chalk.dim(`Made with ♥ by adham — https://github.com/domz-1`)}
`);
  process.exit(0);
}

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(VERSION);
  process.exit(0);
}

// ─── Banner ───────────────────────────────────────────────────────────────────
function showBanner() {
  const banner = boxen(
    `${chalk.hex('#38bdf8').bold('✦ Tailwind Cleaner')} ${chalk.dim(`v${VERSION}`)}\n\n` +
    `${chalk.white('Replace arbitrary values with semantic tokens')}\n` +
    `${chalk.white('in your Tailwind CSS projects — offline & fast')}\n\n` +
    `${chalk.dim('by')} ${chalk.cyan.bold('domz-1')} ${chalk.dim('·')} ${chalk.dim.underline('github.com/domz-1/tailwind-cleaner')}`,
    {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: '#38bdf8',
      textAlignment: 'center',
    }
  );
  console.log(banner);
}

// ─── Detect project info ──────────────────────────────────────────────────────
function detectProject(dir) {
  const info = {
    name: null,
    hasTailwindConfig: false,
    tailwindConfigType: null,
    hasPackageJson: false,
    framework: null,
    cssFiles: [],
    detectedDirs: [],
  };

  // Check package.json
  const pkgPath = path.join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    info.hasPackageJson = true;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      info.name = pkg.name || null;

      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps['next']) info.framework = 'Next.js';
      else if (allDeps['nuxt'] || allDeps['nuxt3']) info.framework = 'Nuxt';
      else if (allDeps['vue']) info.framework = 'Vue';
      else if (allDeps['react']) info.framework = 'React';
      else if (allDeps['svelte'] || allDeps['@sveltejs/kit']) info.framework = 'Svelte';
      else if (allDeps['astro']) info.framework = 'Astro';
      else if (allDeps['angular']) info.framework = 'Angular';
    } catch (e) { /* ignore */ }
  }

  // Check tailwind config
  const twConfigs = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs'];
  for (const cfg of twConfigs) {
    if (existsSync(path.join(dir, cfg))) {
      info.hasTailwindConfig = true;
      info.tailwindConfigType = cfg;
      break;
    }
  }

  // Detect CSS files that could contain theme/variables
  const cssSearchPaths = [
    'src/style.css', 'src/styles.css', 'src/index.css', 'src/globals.css', 'src/main.css',
    'src/app/globals.css', 'src/app/style.css',
    'src/assets/css/main.css', 'src/assets/css/style.css', 'src/assets/css/globals.css',
    'src/assets/styles/main.css', 'src/assets/style.css',
    'styles/globals.css', 'styles/index.css', 'styles/main.css',
    'app/globals.css', 'app/layout.css',
    'globals.css', 'index.css', 'style.css',
  ];
  for (const f of cssSearchPaths) {
    if (existsSync(path.join(dir, f))) {
      info.cssFiles.push(f);
    }
  }

  // Detect common source directories
  const commonDirs = ['src', 'app', 'pages', 'components', 'views', 'layouts', 'lib', 'public', 'assets', 'styles', 'design', 'desgin'];
  for (const d of commonDirs) {
    if (existsSync(path.join(dir, d))) {
      info.detectedDirs.push(d);
    }
  }

  return info;
}

// ─── Display detected project ─────────────────────────────────────────────────
function showProjectInfo(info) {
  const lines = [];

  if (info.name) {
    lines.push(`${chalk.dim('Project:')}   ${chalk.white.bold(info.name)}`);
  }
  if (info.framework) {
    lines.push(`${chalk.dim('Framework:')} ${chalk.magenta(info.framework)}`);
  }
  if (info.hasTailwindConfig) {
    lines.push(`${chalk.dim('Config:')}    ${chalk.green('✓')} ${chalk.white(info.tailwindConfigType)}`);
  } else {
    lines.push(`${chalk.dim('Config:')}    ${chalk.yellow('○')} ${chalk.dim('No tailwind config found (will create one)')}`);
  }
  if (info.cssFiles.length > 0) {
    lines.push(`${chalk.dim('CSS files:')} ${chalk.green('✓')} ${chalk.white(info.cssFiles.join(', '))}`);
  }
  if (info.detectedDirs.length > 0) {
    lines.push(`${chalk.dim('Dirs:')}      ${chalk.white(info.detectedDirs.join(', '))}`);
  }

  if (lines.length > 0) {
    console.log(boxen(lines.join('\n'), {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 0, bottom: 1, left: 0, right: 0 },
      borderStyle: 'single',
      borderColor: 'gray',
      title: chalk.dim(' Detected '),
      titleAlignment: 'left',
    }));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  showBanner();

  // Detect project
  const projectInfo = detectProject(rootDir);
  showProjectInfo(projectInfo);

  // ── Question 1: What to process ───────────────────────────────────
  const { processType } = await inquirer.prompt({
    type: 'list',
    name: 'processType',
    message: chalk.cyan('What would you like to clean up?'),
    choices: [
      { name: `${chalk.hex('#f472b6')('●')} Colors only ${chalk.dim('— replace hex/rgb/hsl with named tokens')}`, value: 'colors' },
      { name: `${chalk.hex('#a78bfa')('●')} Units only ${chalk.dim('— replace px/rem/em/% with named tokens')}`, value: 'units' },
      { name: `${chalk.hex('#38bdf8')('●')} Both colors and units ${chalk.dim('— full cleanup')}`, value: 'both' },
    ],
  });

  // ── Question 2: Prefix ────────────────────────────────────────────
  const { usePrefix } = await inquirer.prompt({
    type: 'confirm',
    name: 'usePrefix',
    message: chalk.cyan('Add a prefix to new token names?') + chalk.dim(' (e.g., "app-ocean-blue" instead of "ocean-blue")'),
    default: false,
  });

  let prefix = '';
  if (usePrefix) {
    const prefixChoices = [];

    if (projectInfo.name) {
      prefixChoices.push({
        name: `Use project name ${chalk.dim(`(${projectInfo.name})`)}`,
        value: 'project',
      });
    }
    prefixChoices.push({
      name: 'Enter a custom prefix',
      value: 'custom',
    });

    let prefixType = 'custom';
    if (prefixChoices.length > 1) {
      const result = await inquirer.prompt({
        type: 'list',
        name: 'prefixType',
        message: chalk.cyan('Choose prefix:'),
        choices: prefixChoices,
      });
      prefixType = result.prefixType;
    }

    if (prefixType === 'project' && projectInfo.name) {
      prefix = projectInfo.name;
    } else {
      const { customPrefix } = await inquirer.prompt({
        type: 'input',
        name: 'customPrefix',
        message: chalk.cyan('Enter your custom prefix:'),
        validate: (input) => {
          if (!input.trim()) return 'Prefix cannot be empty';
          if (input.includes(' ')) return 'Prefix cannot contain spaces';
          if (!input.match(/^[a-z0-9-]+$/)) return 'Use lowercase letters, numbers, or hyphens only';
          return true;
        },
        filter: (input) => input.toLowerCase().trim(),
      });
      prefix = customPrefix;
    }
    console.log(chalk.dim(`  → Using prefix: "${chalk.white(prefix)}"\n`));
  }

  // ── Question 3: Approach (v3: CSS vars vs config / v4: auto @theme) ──
  let useCssVariables = false;
  let selectedCssFile = null;

  // Detect if project uses Tailwind v4 (has @theme or @import 'tailwindcss' in CSS)
  let isTailwindV4 = false;
  for (const cssFile of projectInfo.cssFiles) {
    try {
      const cssContent = readFileSync(path.join(rootDir, cssFile), 'utf-8');
      if (cssContent.includes('@theme') || cssContent.includes("@import 'tailwindcss'") || cssContent.includes('@import "tailwindcss"')) {
        isTailwindV4 = true;
        selectedCssFile = cssFile;
        break;
      }
    } catch (e) { /* skip */ }
  }

  if (isTailwindV4) {
    console.log(chalk.green(`  ✓ Tailwind v4 detected`) + chalk.dim(` — colors will be added to @theme in ${selectedCssFile}`));
    console.log(chalk.dim('    (No tailwind.config.js changes needed)\n'));
    // v4 always uses @theme in CSS — no question needed
    useCssVariables = false;
  } else if (processType === 'colors' || processType === 'both') {
    const { approach } = await inquirer.prompt({
      type: 'list',
      name: 'approach',
      message: chalk.cyan('How should colors be stored?'),
      choices: [
        {
          name: `${chalk.yellow('●')} Direct in tailwind.config.js ${chalk.dim('— hex values in theme.extend.colors')}`,
          value: 'config',
        },
        {
          name: `${chalk.cyan('●')} CSS Variables + config ${chalk.dim('— :root vars + var() refs in config')}`,
          value: 'cssVars',
        },
      ],
    });
    useCssVariables = approach === 'cssVars';

    // If CSS variables, let user pick which CSS file
    if (useCssVariables && projectInfo.cssFiles.length > 0) {
      if (projectInfo.cssFiles.length === 1) {
        selectedCssFile = projectInfo.cssFiles[0];
        console.log(chalk.dim(`  → CSS variables will be written to: ${chalk.white(selectedCssFile)}\n`));
      } else {
        const { cssFile } = await inquirer.prompt({
          type: 'list',
          name: 'cssFile',
          message: chalk.cyan('Which CSS file should contain the :root variables?'),
          choices: projectInfo.cssFiles.map(f => ({
            name: chalk.white(f),
            value: f,
          })),
        });
        selectedCssFile = cssFile;
      }
    } else if (useCssVariables && projectInfo.cssFiles.length === 0) {
      console.log(chalk.yellow('  ⚠ No CSS files detected — will fall back to direct config.\n'));
      useCssVariables = false;
    }
  }

  // ── Question 4: Exclude dirs ──────────────────────────────────────
  const smartExcludes = buildExcludeList(rootDir);
  const gitignoreCount = smartExcludes.length;
  console.log(chalk.dim(`  Auto-excluding ${chalk.white.bold(gitignoreCount)} directories`) + chalk.dim(` (defaults + .gitignore)`));

  const { customizeExcludes } = await inquirer.prompt({
    type: 'confirm',
    name: 'customizeExcludes',
    message: chalk.cyan('Add more directories to exclude?') + chalk.dim(` (currently ${gitignoreCount} patterns)`),
    default: false,
  });

  let excludeDirs = [...smartExcludes];
  if (customizeExcludes) {
    const { extraExcludes } = await inquirer.prompt({
      type: 'input',
      name: 'extraExcludes',
      message: chalk.cyan('Additional directories to exclude') + chalk.dim(' (comma-separated):'),
      filter: (input) => input.trim(),
    });
    if (extraExcludes) {
      const extras = extraExcludes.split(',').map(d => d.trim()).filter(Boolean);
      excludeDirs = [...new Set([...excludeDirs, ...extras])];
      console.log(chalk.dim(`  → Total excludes: ${chalk.white(excludeDirs.length)} directories\n`));
    }
  }

  // ── Question 5: Include extra extensions ──────────────────────────
  const defaultExtensions = ['.jsx', '.js', '.html', '.vue', '.tsx', '.ts', '.css', '.scss', '.less'];
  const { customizeExtensions } = await inquirer.prompt({
    type: 'confirm',
    name: 'customizeExtensions',
    message: chalk.cyan('Customize file extensions to scan?') + chalk.dim(` (default: ${defaultExtensions.join(', ')})`),
    default: false,
  });

  let extensions = [...defaultExtensions];
  if (customizeExtensions) {
    const { extraExtensions } = await inquirer.prompt({
      type: 'input',
      name: 'extraExtensions',
      message: chalk.cyan('Additional extensions') + chalk.dim(' (comma-separated, e.g., .svelte,.astro):'),
      filter: (input) => input.trim(),
    });
    if (extraExtensions) {
      const extras = extraExtensions.split(',').map(e => e.trim()).filter(Boolean).map(e => e.startsWith('.') ? e : `.${e}`);
      extensions = [...extensions, ...extras];
    }
  }

  // ── Config ────────────────────────────────────────────────────────
  const config = {
    prefix: prefix || undefined,
    useCssVariables,
    cssFile: selectedCssFile || undefined,
    excludeDirs,
    extensions,
  };

  console.log(''); // spacing

  // ── Execute ───────────────────────────────────────────────────────
  try {
    if (processType === 'colors' || processType === 'both') {
      console.log(chalk.hex('#f472b6').bold('\n🎨 Processing Colors'));
      console.log(chalk.dim('─'.repeat(40)) + '\n');
      const colorReplacer = new ColorReplacer(config);
      await colorReplacer.run(rootDir);
    }

    if (processType === 'units' || processType === 'both') {
      console.log(chalk.hex('#a78bfa').bold('\n📏 Processing Units & Values'));
      console.log(chalk.dim('─'.repeat(40)) + '\n');
      const arbitraryValueReplacer = new ArbitraryValueReplacer(config);
      await arbitraryValueReplacer.run(rootDir);
    }

    // ── Done ──────────────────────────────────────────────────────────
    console.log('\n' + boxen(
      `${chalk.green.bold('✓ All done!')}\n\n` +
      `${chalk.dim("Don't forget to restart your dev server.")}`,
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        margin: { top: 0, bottom: 1, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'green',
        textAlignment: 'center',
      }
    ));

    process.exit(0);
  } catch (error) {
    console.error(chalk.red.bold(`\n✖ Fatal error: ${error.message}`));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red.bold(`\n✖ Unexpected error: ${error.message}`));
  process.exit(1);
});
