import fs from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * Default directories to always exclude from scanning.
 * These are common non-source directories that contain
 * design files, build artifacts, dependencies, etc.
 */
export const DEFAULT_EXCLUDE_DIRS = [
    // Package managers & dependencies
    'node_modules', '.pnpm', '.yarn', '.bun',
    // Version control
    '.git', '.svn', '.hg',
    // Build output
    'dist', 'build', 'out', '.output', 'coverage',
    // Frameworks
    '.next', '.nuxt', '.svelte-kit', '.astro',
    // Design / static / non-source
    'design', 'desgin', 'designs',
    'docs', 'doc', 'documentation',
    'public', 'static', 'assets',
    'postman', 'scripts',
    'test', 'tests', '__tests__', 'e2e', 'cypress',
    'ref', 'reference', 'mockups', 'mocks',
    'storybook', '.storybook', 'stories',
    // IDE / config
    '.vscode', '.idea', '.fleet',
    // Misc
    'tmp', 'temp', '.cache', '.turbo',
];

/**
 * Parse a .gitignore file and extract directory patterns.
 * Returns an array of directory names to exclude.
 */
export function parseGitignore(rootDir) {
    const gitignorePath = path.join(rootDir, '.gitignore');
    const dirs = [];

    if (!existsSync(gitignorePath)) return dirs;

    try {
        const content = readFileSync(gitignorePath, 'utf-8');
        const lines = content.split('\n');

        for (let line of lines) {
            line = line.trim();

            // Skip comments and empty lines
            if (!line || line.startsWith('#')) continue;

            // Skip negation patterns
            if (line.startsWith('!')) continue;

            // Extract directory names (lines ending with / or simple dir names)
            // e.g., "node_modules/", "dist", "build/", ".env"
            const cleanLine = line.replace(/\/$/, '').replace(/^\*\*\//, '');

            // Only add if it looks like a directory name (no complex glob patterns)
            if (/^[a-zA-Z0-9._-]+$/.test(cleanLine) && !cleanLine.includes('.') || cleanLine.endsWith('/')) {
                dirs.push(cleanLine.replace(/\/$/, ''));
            }
        }
    } catch (e) {
        // Silently ignore unreadable .gitignore
    }

    return dirs;
}

/**
 * Build the full exclude list: defaults + .gitignore + user extras.
 */
export function buildExcludeList(rootDir, userExcludes = []) {
    const gitignoreDirs = parseGitignore(rootDir);
    const allExcludes = new Set([
        ...DEFAULT_EXCLUDE_DIRS,
        ...gitignoreDirs,
        ...userExcludes,
    ]);
    return Array.from(allExcludes);
}
