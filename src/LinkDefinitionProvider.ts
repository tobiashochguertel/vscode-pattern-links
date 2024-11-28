import * as vscode from "vscode";

/**
 * Provide links for the given regex and target template.
 */
export class LinkDefinitionProvider implements vscode.DocumentLinkProvider {
  private pattern: string;
  private flags: string;
  private targetTemplate: string;

  constructor(pattern: string, flags: string, targetTemplate: string) {
    this.pattern = pattern;
    this.targetTemplate = targetTemplate;
    this.flags = flags;

    if (!this.flags.includes("g")) {
      this.flags += "g";
    }
  }

  public provideDocumentLinks(
    document: Pick<vscode.TextDocument, "getText" | "positionAt">
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const regEx = new RegExp(this.pattern, this.flags);
    const text = document.getText();
    const links: vscode.DocumentLink[] = [];

    let match: RegExpExecArray | null;
    while ((match = regEx.exec(text))) {
      console.log('Match found:', match);
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      // Replace:
      // - $0 with match[0]
      // - $1 with match[1]
      // - \$1 with $1 (respect escape character)
      // - ...etc
      const url = this.targetTemplate
        .replace(/(^|[^\\])\$(\d+)/g, (fullMatch, nonEscapeChar, index) => {
          if (match !== null) {
            const value = match[Number(index)];
            return nonEscapeChar + (value !== undefined ? value : `$${index}`);
          }
          return fullMatch;
        })
        .replace(/\\\$/g, "$");
      console.log('Generated URL before escape handling:', url);
      console.log('Generated URL after escape handling:', url);

      // Create URI based on URL type
      let target: vscode.Uri;
      if (url.startsWith('file://')) {
        // For file URLs, handle path properly
        const filePath = url.replace(/^file:\/\/\/?/, '');
        if (filePath.startsWith('.')) {
          // Handle relative paths by preserving the original format
          target = vscode.Uri.parse(url);
        } else {
          // Handle absolute paths with proper space encoding
          const encodedPath = filePath.split('/').map(segment => 
            segment.replace(/ /g, '%20')
          ).join('/');
          
          // Use file scheme directly to avoid path parsing issues
          target = vscode.Uri.from({
            scheme: 'file',
            path: '/' + encodedPath // Ensure single leading slash
          });
        }
      } else {
        // For non-file URLs, use Uri.parse()
        target = vscode.Uri.parse(url);
      }

      const decoration: vscode.DocumentLink = {
        range,
        target,
      };
      links.push(decoration);
    }

    return links;
  }
}
