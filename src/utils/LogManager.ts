import * as fs from 'fs';
import * as vscode from 'vscode';

export class LogManager {
    private static readonly MB_TO_BYTES = 1024 * 1024;
    private logQueue: string[] = [];
    private lastWrite = Date.now();
    private writeTimeout: NodeJS.Timeout | null = null;
    private logPath: string;

    constructor(logPath: string) {
        this.logPath = logPath;
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('patternlinks.debug')) {
                // Configuration changed, update custom log path if needed
                const config = vscode.workspace.getConfiguration('patternlinks.debug');
                const customPath = config.get<string>('customLogPath');
                if (customPath) {
                    this.logPath = customPath;
                }
            }
        });
    }

    private getConfig() {
        const config = vscode.workspace.getConfiguration('patternlinks.debug');
        return {
            maxLogSize: (config.get<number>('logFileMaxSize') ?? 5) * LogManager.MB_TO_BYTES,
            maxLogFiles: config.get<number>('maxLogFiles') ?? 5,
            rateLimit: {
                interval: config.get<number>('rateLimit.interval') ?? 100,
                batchSize: config.get<number>('rateLimit.batchSize') ?? 10
            }
        };
    }

    /**
     * Write a message to the log file with rate limiting
     */
    public async write(message: string): Promise<void> {
        this.logQueue.push(message);

        // If we're not waiting for a write already, schedule one
        if (!this.writeTimeout) {
            const now = Date.now();
            const timeSinceLastWrite = now - this.lastWrite;
            const config = this.getConfig();
            const delay = Math.max(0, config.rateLimit.interval - timeSinceLastWrite);

            this.writeTimeout = setTimeout(() => this.processQueue(), delay);
        }
    }

    /**
     * Process the queued log messages
     */
    private async processQueue(): Promise<void> {
        this.writeTimeout = null;
        this.lastWrite = Date.now();

        const config = this.getConfig();
        // Take up to batchSize messages from the queue
        const messages = this.logQueue.splice(0, config.rateLimit.batchSize);
        if (messages.length === 0) return;

        try {
            // Check if we need to rotate logs
            await this.checkRotation();

            // Write messages to file
            await fs.promises.appendFile(this.logPath, messages.join('\n') + '\n');

            // If there are more messages, schedule another write
            if (this.logQueue.length > 0) {
                this.writeTimeout = setTimeout(() => this.processQueue(), config.rateLimit.interval);
            }
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    /**
     * Check if log rotation is needed and perform rotation if necessary
     */
    private async checkRotation(): Promise<void> {
        try {
            const config = this.getConfig();
            // Check if the log file exists and its size
            const stats = await fs.promises.stat(this.logPath).catch(() => null);
            if (!stats || stats.size < config.maxLogSize) return;

            // Rotate logs
            for (let i = config.maxLogFiles - 1; i >= 0; i--) {
                const oldPath = i === 0 ? this.logPath : `${this.logPath}.${i}`;
                const newPath = `${this.logPath}.${i + 1}`;

                if (await this.fileExists(oldPath)) {
                    if (i === config.maxLogFiles - 1) {
                        await fs.promises.unlink(oldPath);
                    } else {
                        await fs.promises.rename(oldPath, newPath);
                    }
                }
            }

            // Create a new empty log file
            await fs.promises.writeFile(this.logPath, '');
        } catch (error) {
            console.error('Error rotating log files:', error);
        }
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}
