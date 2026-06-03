import * as fs from 'fs';
import * as path from 'path';

export function resolveEnvFiles(composeDir: string, workspaceRoot: string, envFiles: string[]): string[] {
    return envFiles.map((file) => {
        const inComposeDir = path.join(composeDir, file);
        if (fs.existsSync(inComposeDir)) {
            return inComposeDir;
        }
        const inWorkspace = path.join(workspaceRoot, file);
        if (fs.existsSync(inWorkspace)) {
            return inWorkspace;
        }
        return file;
    });
}
