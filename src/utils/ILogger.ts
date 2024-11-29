import * as vscode from 'vscode';

export interface ILogger {
    // Basic logging
    log(message: string): void;
    logError(error: Error): void;

    // Application lifecycle logging
    logStartup(): void;
    logShutdown(): void;
    logActivated(rulesCount: number): void;
    logDeactivated(): void;

    // Configuration logging
    logConfigurationReload(rulesCount: number): void;

    // Resource management
    registerDisposable(context: vscode.ExtensionContext): void;
    dispose(): void;
}
