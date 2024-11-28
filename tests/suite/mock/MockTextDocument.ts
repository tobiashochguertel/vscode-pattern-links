import * as vscode from "vscode";

export class MockTextDocument implements vscode.TextDocument {
  private readonly _content: string;
  
  constructor(content: string) {
    this._content = content;
  }

  get uri(): vscode.Uri {
    return vscode.Uri.parse("file:///test.txt");
  }

  get fileName(): string {
    return "/test.txt";
  }

  get isUntitled(): boolean {
    return false;
  }

  get languageId(): string {
    return "plaintext";
  }

  get version(): number {
    return 1;
  }

  get isDirty(): boolean {
    return false;
  }

  get isClosed(): boolean {
    return false;
  }

  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }

  get eol(): vscode.EndOfLine {
    return vscode.EndOfLine.LF;
  }

  get lineCount(): number {
    return this._content.split("\n").length;
  }

  lineAt(line: number | vscode.Position): vscode.TextLine {
    const lineNumber = typeof line === "number" ? line : line.line;
    const lines = this._content.split("\n");
    const text = lines[lineNumber] || "";
    
    return {
      lineNumber,
      text,
      range: new vscode.Range(
        new vscode.Position(lineNumber, 0),
        new vscode.Position(lineNumber, text.length)
      ),
      rangeIncludingLineBreak: new vscode.Range(
        new vscode.Position(lineNumber, 0),
        new vscode.Position(lineNumber, text.length + 1)
      ),
      firstNonWhitespaceCharacterIndex: text.search(/\S/),
      isEmptyOrWhitespace: text.trim().length === 0,
    };
  }

  offsetAt(position: vscode.Position): number {
    const lines = this._content.split("\n");
    let offset = 0;
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += (lines[i]?.length ?? 0) + 1; // +1 for newline
    }
    return offset + Math.min(position.character, lines[position.line]?.length ?? 0);
  }

  positionAt(offset: number): vscode.Position {
    let line = 0;
    let character = 0;
    let currentOffset = 0;
    const lines = this._content.split("\n");

    while (currentOffset <= offset && line < lines.length) {
      const lineLength = lines[line]?.length ?? 0;
      if (currentOffset + lineLength + 1 > offset) {
        character = offset - currentOffset;
        break;
      }
      currentOffset += lineLength + 1;
      line++;
    }

    return new vscode.Position(line, character);
  }

  getText(range?: vscode.Range): string {
    if (!range) {
      return this._content;
    }

    const lines = this._content.split("\n");
    let text = "";

    for (let i = range.start.line; i <= range.end.line && i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (i === range.start.line) {
        if (i === range.end.line) {
          text += line.substring(range.start.character, range.end.character);
        } else {
          text += line.substring(range.start.character) + "\n";
        }
      } else if (i === range.end.line) {
        text += line.substring(0, range.end.character);
      } else {
        text += line + "\n";
      }
    }

    return text;
  }

  getWordRangeAtPosition(position: vscode.Position, regex?: RegExp): vscode.Range | undefined {
    const line = this.lineAt(position).text;
    const defaultWordRegex = /\w+/g;
    const wordRegex = regex || defaultWordRegex;
    
    let match: RegExpExecArray | null;
    while ((match = wordRegex.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (position.character >= start && position.character <= end) {
        return new vscode.Range(
          new vscode.Position(position.line, start),
          new vscode.Position(position.line, end)
        );
      }
    }
    return undefined;
  }

  validateRange(range: vscode.Range): vscode.Range {
    const start = this.validatePosition(range.start);
    const end = this.validatePosition(range.end);
    return new vscode.Range(start, end);
  }

  validatePosition(position: vscode.Position): vscode.Position {
    let line = position.line;
    let character = position.character;

    if (line < 0) {
      line = 0;
      character = 0;
    } else if (line >= this.lineCount) {
      line = this.lineCount - 1;
      character = this.lineAt(line).text.length;
    }

    const maxCharacter = this.lineAt(line).text.length;
    if (character < 0) {
      character = 0;
    } else if (character > maxCharacter) {
      character = maxCharacter;
    }

    return new vscode.Position(line, character);
  }
}
