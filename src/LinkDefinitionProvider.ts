import * as vscode from "vscode";
import { Rule, getConfig } from "./config";
import { debugManager } from "./utils/DebugManager";
import { TextProcessor } from "./utils/TextProcessor";
import { LoopDetector } from "./utils/LoopDetector";

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
    // Skip processing debug logs and configuration files
    if (document.uri.fsPath.includes('.log') || 
        document.uri.fsPath.endsWith('package.json') ||
        document.uri.fsPath.endsWith('.vscodeignore')) {
      return [];
    }

    if (debugManager.isDebugEnabled()) {
      debugManager.log('\n=== Document Information ===');
      debugManager.log(`Document: ${document.uri.toString()}`);
      debugManager.log(`Language: ${document.languageId}`);
      debugManager.log(`Line Count: ${document.lineCount}`);

      debugManager.log('\n=== Provider Configuration ===');
      debugManager.log(`Pattern: ${this.pattern}`);
      debugManager.log(`Flags: ${this.flags}`);
      debugManager.log(`Target Template: ${this.targetTemplate}`);

      const config = getConfig();
      debugManager.log('\n=== Rules ===');
      config.rules.forEach((rule, index) => {
        debugManager.log(`Rule ${index + 1}:`);
        debugManager.log(`  Pattern: ${rule.linkPattern}`);
        debugManager.log(`  Flags: ${rule.linkPatternFlags || 'none'}`);
        debugManager.log(`  Target: ${rule.linkTarget}`);
        if (rule.description) {
          debugManager.log(`  Description: ${rule.description}`);
        }
      });
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

      if (debugManager.isDebugEnabled()) {
        debugManager.log(`\nProcessing Rule:`);
        debugManager.log(`Pattern: ${rule.linkPattern}`);
        debugManager.log(`Flags: ${finalFlags}`);
        debugManager.log(`Target: ${rule.linkTarget}`);
      }

      // Get cached RegExp instance
      const regex = TextProcessor.getRegExp(rule.linkPattern, finalFlags);

      // Skip processing if the document contains pattern definitions
      const skipPatterns = [
        rule.linkPattern,
        '@document',
        'linkPattern',
        'linkTarget'
      ];

      // Process document in chunks
      for (const { text, offset, canProcess } of TextProcessor.getTextChunks(document, skipPatterns)) {
        if (!canProcess) continue;

        let match: RegExpExecArray | null;
        LoopDetector.startMonitoring(document.uri.toString(), rule.linkPattern);

        while ((match = regex.exec(text)) !== null) {
          if (!TextProcessor.shouldContinueMatching(document)) {
            if (debugManager.isDebugEnabled()) {
              debugManager.log(`Maximum matches reached for document`);
            }
            break;
          }

          // Check for potential infinite loops
          if (!LoopDetector.checkIteration(document.uri.toString(), rule.linkPattern, match.index + offset)) {
            break;
          }

          if (debugManager.isDebugEnabled()) {
            debugManager.log(`\nFound Match:`);
            debugManager.log(`Full Match: "${match[0]}"`);
            for (let i = 1; i < match.length; i++) {
              debugManager.log(`Group ${i}: "${match[i] || ''}"`);
            }
          }

          const startPos = document.positionAt(offset + match.index);
          const endPos = document.positionAt(offset + match.index + match[0].length);
          const range = new vscode.Range(startPos, endPos);

          const uri = this.createUri(match[0], rule);

          if (!uri) {
            if (debugManager.isDebugEnabled()) {
              debugManager.log(`No URI generated for match`);
            }
            continue;
          }

          if (debugManager.isDebugEnabled()) {
            debugManager.log(`Generated URI: ${uri}`);
          }

          // For file:// URIs, handle them differently based on path type
          let parsedUri: vscode.Uri;
          if (uri.startsWith('file://')) {
            const match = uri.match(/^file:\/\/(.*)$/);
            if (!match?.[1]) {
              if (debugManager.isDebugEnabled()) {
                debugManager.log(`Invalid file:// URI: ${uri}`);
              }
              continue;
            }

            if (debugManager.isDebugEnabled()) {
              debugManager.log(`Processing file path: ${match[1]}`);
              debugManager.log(`Path type: ${match[1].startsWith('.') ? 'relative' : 'absolute'}`);
            }

            parsedUri = match[1].startsWith('.')
              ? vscode.Uri.parse(uri)  // Relative path
              : vscode.Uri.file(match[1]);  // Absolute path

            if (debugManager.isDebugEnabled()) {
              debugManager.log(`Parsed URI: ${parsedUri.toString()}`);
            }
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

        LoopDetector.stopMonitoring(document.uri.toString(), rule.linkPattern);

        // Reset lastIndex for the next chunk
        regex.lastIndex = 0;
      }
    }

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`\nTotal links found: ${links.length}`);
    }

    return links;
  }

  protected createUri(matchText: string, rule: Rule): string {
    if (debugManager.isDebugEnabled()) {
      debugManager.log(`\nCreating URI:`);
      debugManager.log(`Match Text: "${matchText}"`);
      debugManager.log(`Pattern: ${rule.linkPattern}`);
      debugManager.log(`Target Template: ${rule.linkTarget}`);
    }

    const regex = TextProcessor.getRegExp(rule.linkPattern, rule.linkPatternFlags ?? "");
    const matches = matchText.match(regex);

    if (!matches) {
      if (debugManager.isDebugEnabled()) {
        debugManager.log(`No matches found for pattern`);
      }
      return "";
    }

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`\nCapture Groups:`);
      debugManager.log(`Full Match: "${matches[0]}"`);
      for (let i = 1; i < matches.length; i++) {
        debugManager.log(`Group ${i}: "${matches[i] || ''}"`);
      }
    }

    let uri = rule.linkTarget;

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`\nReplacing Groups:`);
      debugManager.log(`Initial URI: ${uri}`);
    }

    // Replace $0 with the full match first
    uri = uri.replace(/(?<!\\)\$0/g, matches[0]);

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`After $0 replacement: ${uri}`);
    }

    // Process capture groups in reverse order to handle double-digit indices
    for (let i = matches.length - 1; i >= 1; i--) {
      const capture = matches[i] || "";
      if (debugManager.isDebugEnabled()) {
        debugManager.log(`Processing $${i}: "${capture}"`);
      }

      // Handle normal capture groups first
      const pattern = new RegExp(`(?<!\\\\)\\$${i}`, "g");
      uri = uri.replace(pattern, capture);

      if (debugManager.isDebugEnabled()) {
        debugManager.log(`After $${i} replacement: ${uri}`);
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
