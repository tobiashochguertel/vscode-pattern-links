import * as vscode from 'vscode';
import { Rule } from './config';

class DebugManager {
    private static instance: DebugManager | null = null;
    private outputChannel: vscode.OutputChannel;
    private enabled: boolean = false;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Pattern Links Debug');
    }

    public static getInstance(): DebugManager {
        if (DebugManager.instance === null) {
            DebugManager.instance = new DebugManager();
        }
        return DebugManager.instance;
    }

    public toggleDebug(): void {
        this.enabled = !this.enabled;
        this.log(`Debug mode ${this.enabled ? 'enabled' : 'disabled'}`);
        vscode.window.showInformationMessage(`Pattern Links: Debug mode ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    public isDebugEnabled(): boolean {
        return this.enabled;
    }

    public log(message: string): void {
        if (this.enabled && message.length > 0) {
            const timestamp = new Date().toISOString();
            this.outputChannel.appendLine(`[${timestamp}] ${message}`);
        }
    }

    public logLinkCreation(text: string, rule: Rule, uri: string): void {
        if (this.enabled && text.length > 0) {
            this.log(`Link created:
    Text: ${text}
    Pattern: ${rule.linkPattern}
    Flags: ${rule.linkPatternFlags ?? 'none'}
    Target: ${rule.linkTarget}
    Final URI: ${uri}
            `);
        }
    }

    public getHoverMessage(text: string, rule: Rule, uri: string): string {
        return new vscode.MarkdownString(`**Pattern Links Debug Info**
* Matched text: \`${text}\`
* Pattern: \`${rule.linkPattern}\`
* Flags: \`${rule.linkPatternFlags ?? 'none'}\`
* Target template: \`${rule.linkTarget}\`
* Final URI: ${uri}
        `).toString();
    }
}

export const debugManager = DebugManager.getInstance();
