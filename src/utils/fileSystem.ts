import * as fs from 'fs';
import * as path from 'path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'out', 'dist', '.venv', 'vendor']);

export function findFileByBasename(dir: string, basename: string, maxDepth: number): string | null {
    if (maxDepth < 0) {
        return null;
    }
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return null;
    }
    for (const entry of entries) {
        if (entry.isFile() && entry.name === basename) {
            return path.join(dir, entry.name);
        }
    }
    for (const entry of entries) {
        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            const found = findFileByBasename(path.join(dir, entry.name), basename, maxDepth - 1);
            if (found) {
                return found;
            }
        }
    }
    return null;
}
