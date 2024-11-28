import * as vscode from "vscode";
import { Rule, getConfig } from "./config";
import { debugManager } from "./debug";

/**
 * Provide links for the given regex and target template.
 * 
 * Special handling for file:// URIs:
 * - Absolute paths (starting with /): Uses vscode.Uri.file() to properly encode special characters
 * - Relative paths (starting with . or ..): Uses vscode.Uri.parse() to preserve the file:// prefix
 * - Other URIs (e.g., http://): Uses vscode.Uri.parse()
 */
export class LinkDefinitionProvider implements vscode.DocumentLinkProvider {
  private pattern?: string;
  private flags?: string;
  private targetTemplate?: string;

  constructor(pattern?: string, flags?: string, targetTemplate?: string) {
    this.pattern = pattern;
    this.flags = flags;
    this.targetTemplate = targetTemplate;
  }

  public async provideDocumentLinks(
    document: vscode.TextDocument
  ): Promise<vscode.DocumentLink[]> {
    console.log(`[LinkDefinitionProvider] Pattern:`, this.pattern);
    console.log(`[LinkDefinitionProvider] Flags:`, this.flags);
    console.log(`[LinkDefinitionProvider] Target Template:`, this.targetTemplate);
    console.log(`[LinkDefinitionProvider] Document Text:`, document.getText());

    const config = getConfig();
    const rules = (this.pattern !== undefined && this.targetTemplate !== undefined)
      ? [
        {
          linkPattern: this.pattern,
          linkPatternFlags: this.flags ?? "",
          linkTarget: this.targetTemplate,
        } as Rule,
      ]
      : config.rules;

    const links: vscode.DocumentLink[] = [];

    for (const rule of rules) {
      // Ensure 'g' flag is present but not duplicated
      const flags = rule.linkPatternFlags ?? "";
      const finalFlags = flags.includes("g") ? flags : "g" + flags;

      const regex = new RegExp(rule.linkPattern, finalFlags);

      const text = document.getText();
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        console.log(`[LinkDefinitionProvider] Match found:`, match);
        console.log(`[LinkDefinitionProvider] Match groups:`, match.groups);

        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);

        const uri = this.createUri(match[0], rule);
        console.log(`[LinkDefinitionProvider] Created URI:`, uri);

        // For file:// URIs, we need to handle them differently based on whether they are absolute or relative paths:
        // 1. For absolute paths (starting with /), we use vscode.Uri.file() to properly handle encoding of special characters
        // 2. For relative paths (starting with . or ..), we preserve the file:// prefix and use vscode.Uri.parse()
        // 3. For other URIs (e.g., http://), we use vscode.Uri.parse()
        let parsedUri: vscode.Uri;
        if (uri.startsWith('file://')) {
          const match = uri.match(/^file:\/\/(.*)$/);
          if (!match?.[1]) {
            console.log(`[LinkDefinitionProvider] Invalid file:// URI:`, uri);
            continue;
          }

          // For relative paths, we need to preserve the file:// prefix to maintain the correct path resolution
          if (match[1].startsWith('.')) {
            parsedUri = vscode.Uri.parse(uri);
          } else {
            // For absolute paths, use vscode.Uri.file() to properly encode special characters (e.g., spaces as %20)
            parsedUri = vscode.Uri.file(match[1]);
          }
        } else {
          parsedUri = vscode.Uri.parse(uri);
        }

        const link = new vscode.DocumentLink(range, parsedUri);

        if (debugManager.isDebugEnabled()) {
          link.tooltip = debugManager.getHoverMessage(match[0], rule, uri);
        }
        debugManager.logLinkCreation(match[0], rule, uri);

        links.push(link);
      }
    }

    console.log(`[LinkDefinitionProvider] Total links found:`, links.length);
    return links;
  }

  protected createUri(matchText: string, rule: Rule): string {
    console.log(`[LinkDefinitionProvider.createUri] Original matchText:`, matchText);
    console.log(`[LinkDefinitionProvider.createUri] Rule:`, rule);

    const matches = matchText.match(new RegExp(rule.linkPattern, rule.linkPatternFlags));
    console.log(`[LinkDefinitionProvider.createUri] Matches:`, matches);

    if (!matches) {
      console.log(`[LinkDefinitionProvider.createUri] No matches found, returning empty string`);
      return "";
    }

    let uri = rule.linkTarget;
    console.log(`[LinkDefinitionProvider.createUri] Initial target URI:`, uri);

    // Replace $0 with the full match first
    uri = uri.replace(/(?<!\\)\$0/g, matches[0]);

    // Process capture groups in reverse order to handle double-digit indices
    for (let i = matches.length - 1; i >= 1; i--) {
      const capture = matches[i] || "";
      console.log(`[LinkDefinitionProvider.createUri] Processing capture group ${i}:`, capture);

      // Handle normal capture groups first
      const pattern = new RegExp(`(?<!\\\\)\\$${i}`, "g");
      uri = uri.replace(pattern, capture);

      console.log(`[LinkDefinitionProvider.createUri] URI after replacing group ${i}:`, uri);
    }

    // Replace escaped $ with regular $
    uri = uri.replace(/\\\$/g, "$");

    console.log(`[LinkDefinitionProvider.createUri] Final URI:`, uri);
    return uri;
  }
}
