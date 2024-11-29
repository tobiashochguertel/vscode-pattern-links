import * as vscode from 'vscode';
import { Rule, LogLevel, getConfig } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { FileLogWriter } from './FileLogWriter';

/**
 * Manages debug logging and configuration for the Pattern Links extension.
 * 
 * @remarks
 * The DebugManager provides:
 * - Debug mode toggle for detailed logging
 * - File-based logging with rotation
 * - VSCode output channel integration
 * - Configuration-based logging levels
 * - Hover information for pattern links
 * 
 * It follows the singleton pattern to ensure consistent logging across the extension.
 * 
 * @example
 * ```typescript
 * const debug = DebugManager.getInstance();
 * debug.toggleDebug();           // Enable/disable debug mode
 * debug.log('Debug message');    // Log a message
 * ```
 */
export class DebugManager {
    private static instance: DebugManager | null = null;
    private outputChannel: vscode.OutputChannel;
    private logWriter: FileLogWriter | null = null;
    private logFilePath: string = '';
    private enabled: boolean = false;
    private fileLoggingEnabled: boolean = false;
    private logLevel: LogLevel = 'info';

    /**
     * Creates a new DebugManager instance.
     * Use {@link getInstance} to get the singleton instance.
     * 
     * @private
     */
    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Pattern Links Debug');
        this.updateFromConfig();

        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('patternlinks.debug')) {
                this.updateFromConfig();
            }
        });
    }

    /**
     * Updates the debug configuration from VSCode settings.
     * Called on initialization and when configuration changes.
     * 
     * @private
     */
    private updateFromConfig(): void {
        const { debug: config } = getConfig();
        this.enabled = config.enabled;
        this.fileLoggingEnabled = config.fileLogging;
        this.logLevel = config.logLevel;

        // Initialize log file if needed
        if (this.fileLoggingEnabled && !this.logWriter) {
            const storagePath = this.getStoragePath();

            if (config.customLogPath) {
                this.logFilePath = config.customLogPath;
            } else if (storagePath) {
                this.logFilePath = path.join(storagePath, 'pattern-links-debug.log');
            }

            if (this.logFilePath) {
                this.initializeLogWriter(config.maxQueueSize, config.logFileMaxSize * 1024 * 1024); // Convert MB to bytes
            }
        } else if (!this.fileLoggingEnabled) {
            this.logWriter = null;
        }
    }

    /**
     * Initializes the log writer with specified settings.
     * 
     * @private
     * @param maxQueueSize - Maximum number of messages to queue before writing to file
     * @param maxFileSize - Maximum size of log file in bytes before rotation
     */
    private initializeLogWriter(maxQueueSize: number, maxFileSize: number): void {
        try {
            const logsDir = path.dirname(this.logFilePath);
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            if (!fs.existsSync(this.logFilePath)) {
                fs.writeFileSync(this.logFilePath, '');
            }
            this.logWriter = new FileLogWriter(this.logFilePath, false, maxQueueSize, maxFileSize);
        } catch (error) {
            console.error('Error initializing log writer:', error);
            this.fileLoggingEnabled = false;
        }
    }

    /**
     * Gets the storage path for log files.
     * 
     * @private
     * @returns The path to the logs directory or empty string if not available
     */
    private getStoragePath(): string {
        const extensionContext = vscode.extensions.getExtension('TobiasHochguertel.pattern-links-fork')?.extensionPath;
        return extensionContext ? path.join(extensionContext, 'logs') : '';
    }

    /**
     * Gets the singleton instance of DebugManager.
     * 
     * @returns The singleton DebugManager instance
     */
    public static getInstance(): DebugManager {
        if (DebugManager.instance === null) {
            DebugManager.instance = new DebugManager();
        }
        return DebugManager.instance;
    }

    /**
     * Checks if a message should be logged based on the current log level.
     * 
     * @private
     * @param level - The level of the message to check
     * @returns True if the message should be logged, false otherwise
     */
    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace'];
        const configIndex = levels.indexOf(this.logLevel);
        const messageIndex = levels.indexOf(level);
        return this.enabled && messageIndex <= configIndex;
    }

    /**
     * Logs a message with optional level.
     * 
     * @param message - The message to log
     * @param level - The log level (default: 'info')
     */
    public async log(message: string, level: LogLevel = 'info'): Promise<void> {
        if (!this.shouldLog(level)) {
            return;
        }

        if (message.length === 0) {
            return;
        }

        // Add level prefix if not already present
        const levelPrefix = `[${level.toUpperCase()}]`;
        if (!message.includes(levelPrefix)) {
            message = `${levelPrefix} ${message}`;
        }

        // Add timestamp if not already present
        if (!message.startsWith('[20')) {
            const timestamp = new Date().toISOString();
            message = `[${timestamp}] ${message}`;
        }

        // Write to output channel
        this.outputChannel.appendLine(message);

        // Write to file if enabled
        if (this.fileLoggingEnabled && this.logWriter) {
            await this.writeToLogFile(message);
        }
    }

    /**
     * Writes a message to the log file.
     * 
     * @private
     * @param message - The message to write
     */
    private async writeToLogFile(message: string): Promise<void> {
        if (this.fileLoggingEnabled && this.logWriter) {
            try {
                await this.logWriter.write(message);
            } catch (error) {
                this.outputChannel.appendLine(`Error writing to log file: ${error}`);
            }
        }
    }

    /**
     * Logs an error message.
     * 
     * @param message - The error message to log
     */
    public async error(message: string): Promise<void> {
        await this.log(message, 'error');
    }

    /**
     * Logs a warning message.
     * 
     * @param message - The warning message to log
     */
    public async warn(message: string): Promise<void> {
        await this.log(message, 'warn');
    }

    /**
     * Logs an info message.
     * 
     * @param message - The info message to log
     */
    public async info(message: string): Promise<void> {
        await this.log(message, 'info');
    }

    /**
     * Logs a debug message.
     * 
     * @param message - The debug message to log
     */
    public async debug(message: string): Promise<void> {
        await this.log(message, 'debug');
    }

    /**
     * Logs a trace message.
     * 
     * @param message - The trace message to log
     */
    public async trace(message: string): Promise<void> {
        await this.log(message, 'trace');
    }

    /**
     * Checks if debug mode is enabled.
     * 
     * @returns True if debug mode is enabled, false otherwise
     */
    public isDebugEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Checks if file logging is enabled.
     * 
     * @returns True if file logging is enabled, false otherwise
     */
    public isFileLoggingEnabled(): boolean {
        return this.fileLoggingEnabled;
    }

    /**
     * Gets the current log file path.
     * 
     * @returns The path to the current log file
     */
    public getLogFilePath(): string {
        return this.logFilePath;
    }

    /**
     * Generates a hover message with debug information for a pattern link.
     * 
     * @param text - The matched text
     * @param rule - The rule that matched
     * @param uri - The generated URI
     * @returns A markdown string with debug information
     */
    public getHoverMessage(text: string, rule: Rule, uri: string): string {
        const description = rule.description ? `\n* Description: ${rule.description}` : '';
        return new vscode.MarkdownString(`**Pattern Links Debug Info**
* Matched text: \`${text}\`
* Pattern: \`${rule.linkPattern}\`
* Flags: \`${rule.linkPatternFlags ?? 'none'}\`
* Target template: \`${rule.linkTarget}\`${description}
* Final URI: ${uri}
    `).value;
    }

    /**
     * Logs information about a created link.
     * 
     * @param text - The matched text
     * @param rule - The rule that matched
     * @param uri - The generated URI
     */
    public async logLinkCreation(text: string, rule: Rule, uri: string): Promise<void> {
        if (text.length === 0 || (!this.enabled && !this.fileLoggingEnabled)) {
            return;
        }

        const description = rule.description ? ` | Description: ${rule.description}` : '';
        const message = `Link created | Text: ${text} | Pattern: ${rule.linkPattern} | Flags: ${rule.linkPatternFlags ?? 'none'} | Target: ${rule.linkTarget}${description} | Final URI: ${uri}`;

        await this.log(message);
    }

    /**
     * Toggles debug mode on/off.
     * Updates the UI to reflect the change.
     */
    public toggleDebug(): void {
        this.enabled = !this.enabled;
        this.log(`Debug mode ${this.enabled ? 'enabled' : 'disabled'}`);
        vscode.window.showInformationMessage(`Pattern Links: Debug mode ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Toggles file logging on/off.
     * Creates log file and directory if needed when enabling.
     */
    public toggleFileLogging(): void {
        this.fileLoggingEnabled = !this.fileLoggingEnabled;
        if (this.fileLoggingEnabled) {
            if (!this.logFilePath) {
                const storagePath = this.getStoragePath();
                if (!storagePath) {
                    vscode.window.showErrorMessage('Pattern Links: Unable to determine storage path for log file');
                    this.fileLoggingEnabled = false;
                    return;
                }
                this.logFilePath = path.join(storagePath, 'pattern-links-debug.log');
            }

            const logsDir = path.dirname(this.logFilePath);
            try {
                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }
                if (!fs.existsSync(this.logFilePath)) {
                    fs.writeFileSync(this.logFilePath, '');
                }
                this.logWriter = new FileLogWriter(this.logFilePath);
            } catch (error) {
                console.error('Error creating log file:', error);
                this.fileLoggingEnabled = false;
                return;
            }
        } else {
            this.logWriter = null;
        }
        vscode.window.showInformationMessage(`Pattern Links: File logging ${this.fileLoggingEnabled ? 'enabled' : 'disabled'}`);
    }
}

export const debugManager = DebugManager.getInstance();
