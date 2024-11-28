const path = require('path');
const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
    {
        label: 'unitTests',
        files: 'out/tests/tests/**/*.test.js',
        version: 'stable',
        args: [
            '--user-data-dir', path.resolve(__dirname, 'test-user-data')
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
