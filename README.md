# Tailwind Cleaner ✦

![Tailwind Cleaner Logo](https://github.com/domz-1/tailwind-cleaner/raw/main/public/logo.jpg)

> A smart CLI tool to replace arbitrary hex colors and values with semantic named tokens in Tailwind CSS projects — fully offline, no API needed.

## Features

- 🎨 **Color Replacement** — Converts hex/rgb/hsl colors to semantic names using the `color-2-name` library (100% offline)
- 📏 **Unit Conversion** — Replaces arbitrary px/rem/em/% values with Tailwind's naming conventions
- ⚡ **Offline & Fast** — No external API calls, everything runs locally
- 🔍 **Smart Detection** — Prioritizes existing Tailwind config colors first
- 🎯 **Auto Config Update** — Automatically updates your `tailwind.config.js` with new semantic values
- 🏷️ **Prefix Support** — Add custom prefixes to avoid naming conflicts
- 🎭 **CSS Variables** — Optionally generates CSS `--var()` variables for dynamic theming
- 🧠 **Project Detection** — Auto-detects your framework (Next.js, Nuxt, Vue, React, etc.)

## Installation

### Using npx (recommended)

```bash
npx tailwind-cleaner
```

### Using bunx

```bash
bunx tailwind-cleaner
```

### Local Installation

```bash
bun add -d tailwind-cleaner
# or
npm install tailwind-cleaner --save-dev
```

Then run:

```bash
npx tailwind-cleaner
```

## Usage

1. Run the tool in your project directory
2. Choose what to process (colors, units, or both)
3. Optionally add a prefix and enable CSS variables
4. The tool scans your files, replaces arbitrary values, and updates your config

```
✦ Tailwind Cleaner v2.0.0

Replace arbitrary values with semantic tokens
in your Tailwind CSS projects — offline & fast

by domz-1 · github.com/domz-1/tailwind-cleaner
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--help, -h` | Show help message |
| `--version, -v` | Show version number |

## How It Works

1. **Scans** your project files for Tailwind classes with arbitrary values
2. **Matches** colors against your existing Tailwind config (highest priority)
3. **Names** unknown colors using the `color-2-name` library (offline, fast)
4. **Converts** numeric values to Tailwind's spacing scale
5. **Replaces** all instances with consistent semantic names
6. **Updates** your `tailwind.config.js` with the new values

## Tailwind CSS v4 Configuration Note

If you're using Tailwind CSS v4 with a `tailwind.config.js` file, add this at the top of your CSS file:

```css
@config "./path/to/tailwind.config.js";
@import 'tailwindcss';
```

## CSS Variables Support

When you choose CSS variables mode, the tool will:

1. Generate CSS variables (e.g., `--ocean-blue: #1a73e8;`) in your global CSS file
2. Update your `tailwind.config.js` to reference them (e.g., `'ocean-blue': 'var(--ocean-blue)'`)

This enables easy dynamic theming and is compatible with modern Tailwind practices.

## Contributing

Contributions are welcome! Please open an issue or PR on [GitHub](https://github.com/domz-1/tailwind-cleaner).

## Author

**[domz-1](https://github.com/domz-1)** · Made with ♥

## License

MIT
