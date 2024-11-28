import * as vscode from 'vscode';
import { Rule } from './config';
import * as fs from 'fs';
import * as path from 'path';
import { LogManager } from './utils/LogManager';

class DebugManager {
    private static instance: DebugManager | null = null;
    private outputChannel: vscode.OutputChannel;
    private enabled: boolean = false;
    private fileLoggingEnabled: boolean = false;
    private logFilePath: string = '';
    private logManager: LogManager | null = null;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Pattern Links Debug');
        // Initialize log file path in the extension's storage path
        const storagePath = this.getStoragePath();
        if (storagePath) {
            this.logFilePath = path.join(storagePath, 'pattern-links-debug.log');
        }
    }

    private getStoragePath(): string {
        const extensionContext = vscode.extensions.getExtension('pattern-links')?.extensionPath;
        return extensionContext ? path.join(extensionContext, 'logs') : '';
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

    public toggleFileLogging(): void {
        this.fileLoggingEnabled = !this.fileLoggingEnabled;
        if (this.fileLoggingEnabled && this.logFilePath) {
            // Create logs directory if it doesn't exist
            const logsDir = path.dirname(this.logFilePath);
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            // Initialize log manager if needed
            if (!this.logManager) {
                this.logManager = new LogManager(this.logFilePath);
            }
            
            this.log(`File logging enabled - Log file location: ${this.logFilePath}`);
        } else {
            this.log(`File logging disabled`);
            this.logManager = null;
        }
        vscode.window.showInformationMessage(`Pattern Links: File logging ${this.fileLoggingEnabled ? 'enabled' : 'disabled'}`);
    }

    public isDebugEnabled(): boolean {
        return this.enabled;
    }

    public isFileLoggingEnabled(): boolean {
        return this.fileLoggingEnabled;
    }

    private async writeToLogFile(message: string): Promise<void> {
        if (this.fileLoggingEnabled && this.logManager) {
            try {
                await this.logManager.write(message);
            } catch (error) {
                this.outputChannel.appendLine(`Error writing to log file: ${error}`);
            }
        }
    }

    public async log(message: string): Promise<void> {
        if (this.enabled && message.length > 0) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] ${message}`;
            this.outputChannel.appendLine(logMessage);
            await this.writeToLogFile(logMessage);
        }
    }

    public async logLinkCreation(text: string, rule: Rule, uri: string): Promise<void> {
        if (this.enabled && text.length > 0) {
            const description = rule.description ? `\nDescription: ${rule.description}` : '';
            const message = `Link created:
    Text: ${text}
    Pattern: ${rule.linkPattern}
    Flags: ${rule.linkPatternFlags ?? 'none'}
    Target: ${rule.linkTarget}${description}
    Final URI: ${uri}
            `;
            await this.log(message);
        }
    }

    public getLogFilePath(): string {
        return this.logFilePath;
    }

    public getHoverMessage(text: string, rule: Rule, uri: string): string {
        const description = rule.description ? `\n* Description: ${rule.description}` : '';
        return new vscode.MarkdownString(`**Pattern Links Debug Info**
* Matched text: \`${text}\`
* Pattern: \`${rule.linkPattern}\`
* Flags: \`${rule.linkPatternFlags ?? 'none'}\`
* Target template: \`${rule.linkTarget}\`${description}
* Final URI: ${uri}
        `).toString();
    }
}

export const debugManager = DebugManager.getInstance();
