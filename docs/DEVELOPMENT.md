# Development Guide

## Recommended VS Code Extensions

This project includes several recommended VS Code extensions to enhance the development experience. These extensions will be automatically suggested when you open the project in VS Code.

### Core Development Extensions

#### TypeScript and Development Tools

- **[TypeScript Nightly](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next)** (`ms-vscode.vscode-typescript-next`)
  - Latest TypeScript features and tooling
  - Enhanced IntelliSense and type checking

#### Code Quality

- **[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)** (`dbaeumer.vscode-eslint`)
  - JavaScript/TypeScript linting
  - Automatic code style enforcement
- **[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)** (`esbenp.prettier-vscode`)
  - Code formatting
  - Maintains consistent code style

#### Testing

- **[Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter)** (`hbenl.vscode-mocha-test-adapter`)
  - Visual test runner for Mocha tests
  - Run and debug tests directly from VS Code

### Additional Tools

#### Error Reporting

- **[TypeScript Problem Matchers](https://marketplace.visualstudio.com/items?itemName=amodio.tsl-problem-matcher)** (`amodio.tsl-problem-matcher`)
  - Enhanced TypeScript error reporting
  - Better problem matching in build tasks
- **[TSLint Problem Matcher](https://marketplace.visualstudio.com/items?itemName=eamodio.tsl-problem-matcher)** (`eamodio.tsl-problem-matcher`)
  - Improved TypeScript lint error visualization
  - Integration with VS Code problems panel

#### Code Quality Enhancements

- **[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)** (`streetsidesoftware.code-spell-checker`)
  - Spell checking for code and comments
  - Supports camelCase and other code-specific patterns
- **[EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)** (`EditorConfig.EditorConfig`)
  - Maintains consistent coding styles
  - Automatically adjusts to project settings

#### Documentation

- **[markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint)** (`DavidAnson.vscode-markdownlint`)
  - Markdown linting and style checking
  - Ensures consistent documentation format
- **[Markdown Preview GitHub Styling](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-preview-github-styles)** (`bierner.markdown-preview-github-styles`)
  - GitHub-style markdown preview
  - What you see is what you get on GitHub

#### UI/UX

- **[VSCode Icons](https://marketplace.visualstudio.com/items?itemName=vscode-icons-team.vscode-icons)** (`vscode-icons-team.vscode-icons`)
  - Enhanced file and folder icons
  - Better visual organization of project files

## Installation

These extensions will be automatically suggested when you open the project in VS Code. To install them:

1. Open VS Code
2. Look for the notification about recommended extensions
3. Click "Install All" to install all recommended extensions
4. Or, selectively choose which extensions to install

Alternatively, you can:

1. Open the Command Palette (Cmd/Ctrl + Shift + P)
2. Type "Show Recommended Extensions"
3. Install the extensions you want

## Configuration

Most extensions are pre-configured through the project's `.vscode/settings.json` file. Key configurations include:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "jest.enable": false,
  "mochaExplorer.files": "src/test/**/*.ts",
  "mochaExplorer.require": "ts-node/register"
}
```

## Unwanted Extensions

Some extensions might conflict with our setup and are explicitly marked as unwanted:

- **Jest for VS Code** (`orta.vscode-jest`): We use Mocha for testing, so Jest is not needed.
