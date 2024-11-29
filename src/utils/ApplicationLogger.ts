import * as vscode from 'vscode';
import { ILogger } from './ILogger';

export class ApplicationLogger implements ILogger {
    private static instance: ApplicationLogger | null = null;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Pattern Links');
    }

    public static getInstance(): ApplicationLogger {
        if (!ApplicationLogger.instance) {
            ApplicationLogger.instance = new ApplicationLogger();
        }
        return ApplicationLogger.instance;
    }

    public registerDisposable(context: vscode.ExtensionContext): void {
        context.subscriptions.push(this.outputChannel);
    }

    public logStartup(): void {
        this.outputChannel.appendLine('Pattern Links extension is starting...');
    }

    public logActivated(rulesCount: number): void {
        this.outputChannel.appendLine('Pattern Links extension activated successfully!');
        this.outputChannel.appendLine(`Active rules: ${rulesCount}`);
    }

    public logShutdown(): void {
        this.outputChannel.appendLine('Pattern Links extension is shutting down...');
    }

    public logDeactivated(): void {
        this.outputChannel.appendLine('Pattern Links extension deactivated successfully!');
    }

    public logConfigurationReload(rulesCount: number): void {
        this.outputChannel.appendLine('Configuration changed, reloading rules...');
        this.outputChannel.appendLine(`New active rules count: ${rulesCount}`);
    }

    public logError(error: Error): void {
        this.outputChannel.appendLine(`Error: ${error.message}`);
        if (error.stack) {
            this.outputChannel.appendLine(`Stack trace: ${error.stack}`);
        }
    }

    public log(message: string): void {
        this.outputChannel.appendLine(message);
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}

export const applicationLogger = ApplicationLogger.getInstance();
