# Link Patterns

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/TobiasHochgurtel/vscode-pattern-links/package-analysis.yml?label=Analysis&logo=github)](https://github.com/TobiasHochgurtel/vscode-pattern-links/actions/workflows/package-analysis.yml)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/TobiasHochgurtel/vscode-pattern-links/sync-to-gitea.yml?label=GitHub%20→%20Gitea&logo=gitea)](https://github.com/TobiasHochgurtel/vscode-pattern-links/actions/workflows/sync-to-gitea.yml)
[![Gitea Status](https://img.shields.io/badge/dynamic/json?url=https://gitea.hochguertel.work/api/v1/repos/TobiasHochgurtel/vscode-pattern-links/actions/workflows/sync-to-github.yml/latest&query=$.status&label=Gitea%20→%20GitHub&logo=gitea)](https://gitea.hochguertel.work/TobiasHochgurtel/vscode-pattern-links/actions?query=workflow%3A"Sync+to+GitHub")

**Link Patterns** is a VS Code extension that automatically turns text into links based upon regex patterns.

![Animated gif showing a code comment that has a link that can be clicked](assets/usage.gif)

## Status

This project is no longer actively maintained. Its spiritual successor is [Regex Robin](https://github.com/dlevs/vscode-regex-robin), which does everything this extension does, and more.

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
