# Tailwind Cleaner
![Tailwind Cleaner Logo](https://github.com/domz-1/tailwind-cleaner/raw/main/public/logo.jpg)
A tool to convert arbitrary values (hex colors, units, etc.) into semantic named values in Tailwind CSS projects.
## Table of Contents
- [Tailwind Cleaner](#tailwind-cleaner)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Installation](#installation)
    - [Using npx (recommended)](#using-npx-recommended)
    - [Local Installation](#local-installation)
  - [Tailwind CSS v4 Configuration Note](#tailwind-css-v4-configuration-note)
  - [Theme Variable Namespaces](#theme-variable-namespaces)
  - [Usage](#usage)
  - [How It Works](#how-it-works)
  - [Contributing](#contributing)
  - [License](#license)
## Features
- Replaces hex colors and arbitrary values with semantic names in your project files
- Converts numeric values and units (px, rem, etc.) to Tailwind's naming conventions
- Prioritizes existing Tailwind config colors and spacing values
- Uses Color Pizza API for color name matching
- Falls back to color-2-name for local color matching
- Automatically updates your tailwind.config.js with new semantic values
- Maintains consistent naming across your entire project
- Adding prefixes to semantic values to avoid naming conflicts
- **[NEW]** Supports generating CSS variables for theming (modern Tailwind approach)
## Installation
### Using npx (recommended)
Run directly with npx:
```bash
npx tailwind-cleaner
```
### Local Installation
Install locally instead of global:
```bash
npm install tailwind-cleaner --save-dev
# or
npm i -g tailwind-cleaner
```
Then run it using:
```bash
npx tailwind-cleaner
```
## Tailwind CSS v4 Configuration Note
If you're using Tailwind CSS v4 with a `tailwind.config.js` file, add this at the top of your CSS file:
```css
@config "./path/to/tailwind.config.js";
@import 'tailwindcss';
```
## CSS Variables Support (New)
The tool now supports the modern approach of using CSS variables for theming. When prompted, if you choose "Yes" to use CSS variables:
1.  The tool will generate CSS variables (e.g., `--primary: 255 0 0;`) in your global CSS file (`src/globals.css`, `src/index.css`, etc.).
2.  It will update your `tailwind.config.js` to reference these variables (e.g., `primary: 'rgb(var(--primary) / <alpha-value>)'`).

This allows for easier dynamic theming and is compatible with modern Tailwind practices.
## Usage
1. Run the tool in your project directory
2. It will scan your project files for Tailwind classes and arbitrary values
3. The tool will suggest semantic replacements
4. Confirm changes to update your files and `tailwind.config.js`
## How It Works
1. Scans your project files for Tailwind classes and arbitrary values
2. Matches colors against existing Tailwind config values first
3. For new colors, uses Color Pizza API or falls back to color-2-name
4. Converts numeric values to Tailwind's spacing scale
5. Updates all instances with consistent semantic names
6. Adds new values to your Tailwind config
## Contributing
Contributions are welcome! Please open an issue or PR on GitHub.
## License
MIT
