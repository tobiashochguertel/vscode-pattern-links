import * as path from 'path';
import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
    {
        label: 'unitTests',
        files: 'out/tests/tests/**/*.test.js',
        version: 'stable',
        //   version: 'insiders',
        //   workspaceFolder: './sampleWorkspace',
        args: [
            '--user-data-dir', path.resolve(__dirname, 'test-user-data') // Use a clean user data directory
        ],
        mocha: {
            ui: 'tdd',
            timeout: 20000
        },
        settings: {
            'editor.fontSize': 14,
            'editor.tabSize': 4,
            'files.autoSave': 'off',
            'editor.minimap.enabled': false,
            'workbench.editor.enablePreview': false,
            'window.menuBarVisibility': 'classic'
        }
    }
]);
