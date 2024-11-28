import * as vscode from "vscode";
import { Rule, getConfig } from "./config";
import { debugManager } from "./debug";
import { TextProcessor } from "./utils/TextProcessor";

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
    if (debugManager.isDebugEnabled()) {
      debugManager.log(`Pattern: ${this.pattern}`);
      debugManager.log(`Flags: ${this.flags}`);
      debugManager.log(`Target Template: ${this.targetTemplate}`);
    }

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

      // Get cached RegExp instance
      const regex = TextProcessor.getRegExp(rule.linkPattern, finalFlags);

      // Process document in chunks
      for (const { text, offset } of TextProcessor.getTextChunks(document)) {
        let match: RegExpExecArray | null;
        
        while ((match = regex.exec(text)) !== null) {
          if (debugManager.isDebugEnabled()) {
            debugManager.log(`Match found: ${JSON.stringify(match)}`);
          }

          const startPos = document.positionAt(offset + match.index);
          const endPos = document.positionAt(offset + match.index + match[0].length);
          const range = new vscode.Range(startPos, endPos);

          const uri = this.createUri(match[0], rule);
          
          if (debugManager.isDebugEnabled()) {
            debugManager.log(`Created URI: ${uri}`);
          }

          if (!uri) continue;

          // For file:// URIs, handle them differently based on path type
          let parsedUri: vscode.Uri;
          if (uri.startsWith('file://')) {
            const match = uri.match(/^file:\/\/(.*)$/);
            if (!match?.[1]) {
              debugManager.log(`Invalid file:// URI: ${uri}`);
              continue;
            }

            parsedUri = match[1].startsWith('.')
              ? vscode.Uri.parse(uri)  // Relative path
              : vscode.Uri.file(match[1]);  // Absolute path
          } else {
            parsedUri = vscode.Uri.parse(uri);
          }

          const link = new vscode.DocumentLink(range, parsedUri);

          if (debugManager.isDebugEnabled()) {
            link.tooltip = debugManager.getHoverMessage(match[0], rule, uri);
            debugManager.logLinkCreation(match[0], rule, uri);
          }

          links.push(link);
        }

        // Reset lastIndex for the next chunk
        regex.lastIndex = 0;
      }
    }

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`Total links found: ${links.length}`);
    }
    
    return links;
  }

  protected createUri(matchText: string, rule: Rule): string {
    if (debugManager.isDebugEnabled()) {
      debugManager.log(`Original matchText: ${matchText}`);
      debugManager.log(`Rule: ${JSON.stringify(rule)}`);
    }

    const regex = TextProcessor.getRegExp(rule.linkPattern, rule.linkPatternFlags ?? "");
    const matches = matchText.match(regex);

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`Matches: ${JSON.stringify(matches)}`);
    }

    if (!matches) {
      if (debugManager.isDebugEnabled()) {
        debugManager.log(`No matches found, returning empty string`);
      }
      return "";
    }

    let uri = rule.linkTarget;

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`Initial target URI: ${uri}`);
    }

    // Replace $0 with the full match first
    uri = uri.replace(/(?<!\\)\$0/g, matches[0]);

    // Process capture groups in reverse order to handle double-digit indices
    for (let i = matches.length - 1; i >= 1; i--) {
      const capture = matches[i] || "";
      if (debugManager.isDebugEnabled()) {
        debugManager.log(`Processing capture group ${i}: ${capture}`);
      }

      // Handle normal capture groups first
      const pattern = new RegExp(`(?<!\\\\)\\$${i}`, "g");
      uri = uri.replace(pattern, capture);

      if (debugManager.isDebugEnabled()) {
        debugManager.log(`URI after replacing group ${i}: ${uri}`);
      }
    }

    // Replace escaped $ with regular $
    uri = uri.replace(/\\\$/g, "$");

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`Final URI: ${uri}`);
    }
    return uri;
  }
}
