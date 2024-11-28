# Link Patterns (Fork)

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/TobiasHochgurtel/vscode-pattern-links/package-analysis.yml?label=Analysis&logo=github)](https://github.com/TobiasHochgurtel/vscode-pattern-links/actions/workflows/package-analysis.yml)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/TobiasHochgurtel/vscode-pattern-links/sync-to-gitea.yml?label=GitHub%20→%20Gitea&logo=gitea)](https://github.com/TobiasHochgurtel/vscode-pattern-links/actions/workflows/sync-to-gitea.yml)
[![Gitea Status](https://img.shields.io/badge/dynamic/json?url=https://gitea.hochguertel.work/api/v1/repos/TobiasHochgurtel/vscode-pattern-links/actions/workflows/sync-to-github.yml/latest&query=$.status&label=Gitea%20→%20GitHub&logo=gitea)](https://gitea.hochguertel.work/TobiasHochgurtel/vscode-pattern-links/actions?query=workflow%3A"Sync+to+GitHub")

> **Note**: This is a fork of [dlevs/vscode-pattern-links](https://github.com/dlevs/vscode-pattern-links) with additional features and improvements.

**Link Patterns** is a VS Code extension that automatically turns text into links based upon regex patterns.

![Animated gif showing a code comment that has a link that can be clicked](assets/usage.gif)

## Installation

You can install this extension in several ways:

1. VS Code Marketplace: Search for `TobiasHochguertel.pattern-links-fork`
2. Command Line:

   ```bash
   code --install-extension TobiasHochguertel.pattern-links-fork
   ```

3. VSIX File:

   ```bash
   code --install-extension pattern-links-fork-1.1.0.vsix
   ```

## Configuration

Multiple patterns can be defined in your VS Code settings. The following examples highlight common use cases.

```jsonc
{
  "patternlinks.rules": [
    {
      "linkPattern": "ISSUE-\\d+",
      "linkTarget": "https://myorg.atlassian.net/browse/$0"
      // Example URL: https://myorg.atlassian.net/browse/ISSUE-299
    },
    {
      "linkPattern": "(FOO|BAR)-(\\d+)",
      "linkTarget": "https://example.com/$1/$2",
      // Example URL: https://example.com/FOO/123

      // Limit to specific languages
      "languages": ["plaintext", "markdown"]
    },
    {
      "linkPattern": "SKU([A-Z_]+)",
      "linkTarget": "https://shop.com?search=$1&min-price=\\$1"
      // Example URL: https://shop.com?search=PRODUCT_CODE&min-price=$1
      // Here, `\` is being used as an escape character to prevent substitution
      // of the second `$1`.
    }
  ]
}
```

### Rule precedence

When two rules apply to the same text, the one defined last wins.

```jsonc
{
  "patternlinks.rules": [
    // Match links like repo-name#22 to the relevant pull request
    {
      "linkPattern": "([a-z_-]+)#(\\d+)",
      "linkPatternFlags": "i", // Case insensitive
      "linkTarget": "https://github.com/myorg/$1/pull/$2"
    },
    // Match links like special-case#22 to the relevant pull request,
    // which is in a different github organisation, and has a long,
    // inconvenient name.
    {
      "linkPattern": "special-case#(\\d+)",
      "linkTarget": "https://github.com/someorg/really-long-inconvenient-name/pull/$1"
    }
  ]
}
```

The text `special-case#22` technically matches both of these rules, but the second one is the one that takes effect.

<!--
⚠️ This relies on potentially undocumented behaviour.

This extension does not enforce this logic, but instead relies on the fact that VS Code
just works like this by default.

TODO: Register only one `LinkDefinitionProvider`, which returns a maximum of one link per text range.
 -->

### File URL Examples

You can create clickable links to local files using various patterns. Here are some examples:

#### Basic File Links

```jsonc
{
  "patternlinks.rules": [
    {
      "linkPattern": "file://(/[^ \\n]+)",
      "linkTarget": "file://$1",
      "description": "Convert file:// URLs to clickable links"
    }
  ]
}
```

#### JSDoc @document Tags

```jsonc
{
  "patternlinks.rules": [
    {
      "linkPattern": "@document (.*?)(?=\\s|$)",
      "linkTarget": "file://$1",
      "description": "Convert @document tags to file links"
    }
  ]
}
```

Example usage in code:

```typescript
/**
 * Some documentation
 * @document ../../../../external-repositories/docs/api.md
 */
```

#### Relative Path Links

```jsonc
{
  "patternlinks.rules": [
    {
      "linkPattern": "file://(\\.[^ \\n]+)",
      "linkTarget": "file://$1",
      "description": "Convert relative file paths to clickable links"
    }
  ]
}
```

Example usage:

```typescript
// See documentation at file://./docs/README.md
// Or parent directory: file://../other-project/README.md
```

Note: The extension properly handles spaces in file paths, automatically encoding them as `%20` in the URL.

### File URL Handling

The extension provides special handling for `file://` URLs to ensure proper path resolution and encoding:

1. **Absolute Paths**: When using absolute paths (starting with `/`), special characters like spaces are automatically encoded:

   ```text
   file:///path/with spaces/file.txt  →  file:///path/with%20spaces/file.txt
   ```

2. **Relative Paths**: When using relative paths (starting with `.` or `..`), the path structure is preserved:

   ```text
   file://./relative/path.txt  →  file://./relative/path.txt
   file://../parent/path.txt   →  file://../parent/path.txt
   ```

3. **Other URIs**: Non-file URLs (e.g., `http://`) are handled normally.

This ensures that both absolute and relative file paths work correctly, while maintaining proper URL encoding for special characters.

### Debugging Links

The extension provides a debug mode to help troubleshoot link matching and generation. To enable debugging:

1. Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux)
2. Run the command `Pattern Links: Toggle Debug Mode`

When debug mode is enabled:

- Hovering over a link will show detailed information about:
  - The matched text
  - The rule that was applied
  - The generated URI
- Debug logs will be written to the Output panel (View > Output, select "Pattern Links" from the dropdown)
- Links will still be clickable and function normally

This is particularly useful when:

- Your regex patterns aren't matching as expected
- The generated URIs aren't what you expect
- You want to understand which rule is being applied to a specific match

To disable debug mode, run the `Pattern Links: Toggle Debug Mode` command again.

## Contributing

1. Clone this repository
2. `npm install` to install dependencies
3. `npm run watch` to start the compiler in watch mode
4. Open this folder in VS Code and start the debugger (`F5`).

## Publishing

This extension is available on both the VS Code Marketplace and Open VSX Registry:

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=TobiasHochgurtel.pattern-links)
- [Open VSX Registry](https://open-vsx.org/extension/TobiasHochgurtel/pattern-links)

### Publishing Process

To publish a new version:

1. Update the version in `package.json`
2. Create and push a new tag:

   ```bash
   git tag v1.x.x  # Replace with your version
   git push origin v1.x.x
   ```

The GitHub Actions workflow will automatically:

- Build and test the extension
- Publish to VS Code Marketplace
- Publish to Open VSX Registry
- Create a GitHub release with the .vsix file

### Manual Publishing

You can also publish manually using the provided npm scripts:

```bash
# Publish to VS Code Marketplace
pnpm run publish:vscode

# Publish to Open VSX Registry
pnpm run publish:ovsx

# Publish to both marketplaces
pnpm run publish:all
```

Note: You'll need to set up the following tokens:

- `VSCODE_MARKETPLACE_TOKEN`: Get from [Visual Studio Marketplace](https://dev.azure.com/)
- `OVSX_TOKEN`: Get from [Open VSX Registry](https://open-vsx.org/)
