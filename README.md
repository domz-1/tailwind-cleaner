# Tailwind Color Cleaner

A tool to replace hex colors with named colors in Tailwind CSS projects.

## Features

- Replaces hex colors with named colors in your project files
- Prioritizes existing Tailwind config colors 
- Uses Color Pizza API for color name matching
- Falls back to color-2-name for local color matching
- Updates your tailwind.config.js automatically

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
