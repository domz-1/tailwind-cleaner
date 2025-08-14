![Tailwind Cleaner Logo](./public/logo.jpg)

# Tailwind Cleaner


A tool to convert arbitrary values (hex colors, units, etc.) into semantic named values in Tailwind CSS projects.

## Features
- Replaces hex colors and arbitrary values with semantic names in your project files
- Converts numeric values and units (px, rem, etc.) to Tailwind's naming conventions
- Prioritizes existing Tailwind config colors and spacing values
- Uses Color Pizza API for color name matching
- Falls back to color-2-name for local color matching
- Automatically updates your tailwind.config.js with new semantic values
- Maintains consistent naming across your entire project
- Adding prefixes to semantic values to avoid naming conflicts

## Installation

### Using npx (recommended)

Run directly with npx:

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
