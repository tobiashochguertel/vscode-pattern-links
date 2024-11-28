const path = require('path');
const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
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
            'terminal.integrated.shell.osx': '/bin/sh', // Set the shell to sh for macOS
            'terminal.integrated.env.shellEnvironmentResolutionTimeout': 1000,
            'files.exclude': {
                '**/.git': true,
                '**/.DS_Store': true,
                // Add more patterns to exclude unnecessary files
            },
            // Add more settings as needed
        }
    }
    // you can specify additional test configurations, too
]);