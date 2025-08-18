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
Alternatively, you can manually move your colors to the `@theme` block using the new Theme variable namespaces format in Tailwind v4.
## Theme Variable Namespaces
Theme variables are defined in namespaces and each namespace corresponds to one or more utility class or variant APIs.
Defining new theme variables in these namespaces will make new corresponding utilities and variants available in your project:
| Namespace          | Utility Classes                                                          |
| ------------------ | ------------------------------------------------------------------------ |
| `--color-*`        | Color utilities like `bg-red-500`, `text-sky-300`, and many more         |
| `--font-*`         | Font family utilities like `font-sans`                                   |
| `--text-*`         | Font size utilities like `text-xl`                                       |
| `--font-weight-*`  | Font weight utilities like `font-bold`                                   |
| `--tracking-*`     | Letter spacing utilities like `tracking-wide`                            |
| `--leading-*`      | Line height utilities like `leading-tight`                               |
| `--breakpoint-*`   | Responsive breakpoint variants like `sm:*`                               |
| `--container-*`    | Container query variants like `@sm:*` and size utilities like `max-w-md` |
| `--spacing-*`      | Spacing and sizing utilities like `px-4`, `max-h-16`, and many more      |
| `--radius-*`       | Border radius utilities like `rounded-sm`                                |
| `--shadow-*`       | Box shadow utilities like `shadow-md`                                    |
| `--inset-shadow-*` | Inset box shadow utilities like `inset-shadow-xs`                        |
| `--drop-shadow-*`  | Drop shadow filter utilities like `drop-shadow-md`                       |
| `--blur-*`         | Blur filter utilities like `blur-md`                                     |
| `--perspective-*`  | Perspective utilities like `perspective-near`                            |
| `--aspect-*`       | Aspect ratio utilities like `aspect-video`                               |
| `--ease-*`         | Transition timing function utilities like `ease-out`                     |
| `--animate-*`      | Animation utilities like `animate-spin`                                  |
For a list of all of the default theme variables, see the [default theme variable reference](https://tailwindcss.com/docs/theme).
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
