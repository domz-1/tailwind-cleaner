# Tailwind Cleaner ✦

![Tailwind Cleaner Logo](https://github.com/domz-1/tailwind-cleaner/raw/main/public/logo.jpg)

> A smart CLI tool to replace arbitrary hex colors and values with semantic named tokens in Tailwind CSS projects — fully offline, no API needed.

## Features

- 🎨 **Color Replacement** — Converts hex/rgb/hsl colors to semantic names using the `color-2-name` library (100% offline)
- 📏 **Unit Conversion** — Replaces arbitrary px/rem/em/% values with Tailwind's naming conventions
- ⚡ **Offline & Fast** — No external API calls, everything runs locally
- 🔍 **Smart Detection** — Prioritizes existing Tailwind config colors first
- 🎯 **Auto Config Update** — Automatically updates your `tailwind.config.js` or `@theme` (v4) with new semantic values
- 🏷️ **Prefix Support** — Add custom prefixes to avoid naming conflicts
- 🎭 **CSS Variables** — Optionally generates CSS `--var()` variables for dynamic theming
- 🧠 **Project Detection** — Auto-detects your framework (Next.js, Nuxt, Vue, React, etc.)
- 🚫 **Smart Excludes** — Auto-ignores design files, docs, tests, build output, and `.gitignore` patterns

## Installation

### Using bunx (recommended)

```bash
bunx tailwind-cleaner
```

### Using npx

```bash
npx tailwind-cleaner
```

### Local Installation

```bash
bun add -d tailwind-cleaner
```

Then run:

```bash
bunx tailwind-cleaner
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

### Run in a specific directory

```bash
bunx tailwind-cleaner ./src
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--help, -h` | Show help message |
| `--version, -v` | Show version number |

## How It Works

1. **Scans** your project files for Tailwind classes with arbitrary values
2. **Matches** colors against your existing Tailwind config/theme (highest priority)
3. **Names** unknown colors using luminance + hue-aware logic (e.g., `deep-black`, `blue-grey`)
4. **Converts** numeric values to Tailwind's spacing scale
5. **Replaces** all instances with consistent semantic names
6. **Updates** your config — `@theme` for Tailwind v4 or `tailwind.config.js` for v3

## Tailwind v4 Support

The tool **auto-detects** Tailwind v4 projects (via `@import 'tailwindcss'` or `@theme` in your CSS). When v4 is detected:

- Colors are added directly to your `@theme` block as `--color-name: #hex;`
- No `tailwind.config.js` changes are needed
- Existing `@theme` colors are preserved and deduplicated

```css
@theme inline {
  /* Colors added by tailwind-cleaner */
  --color-seen-black: #09090b;
  --color-seen-white: #ffffff;
  --color-seen-midnightblue: #001a48;
}
```

## Tailwind v3 Support

For v3 projects, choose between two approaches:

### Direct hex in config

Colors are added as hex values directly to `theme.extend.colors` in `tailwind.config.js`.

### CSS Variables + config

1. Generates CSS variables (e.g., `--ocean-blue: #1a73e8;`) in your global CSS `:root`
2. Updates `tailwind.config.js` to reference them (e.g., `'ocean-blue': 'var(--ocean-blue)'`)

## Smart Directory Exclusion

The tool auto-excludes **46+ directory patterns** by default, including:

- 📦 `node_modules`, `.pnpm`, `.yarn`
- 🏗️ `dist`, `build`, `out`, `coverage`
- 🎨 `design`, `designs`, `docs`, `mockups`, `public`, `assets`
- 🧪 `test`, `tests`, `__tests__`, `e2e`, `cypress`
- ⚙️ `.next`, `.nuxt`, `.svelte-kit`

Plus any patterns from your project's `.gitignore` are automatically honored.

## Contributing

Contributions are welcome! Please open an issue or PR on [GitHub](https://github.com/domz-1/tailwind-cleaner).

## Author

**[domz-1](https://github.com/domz-1)** · Made with ♥

## License

MIT
