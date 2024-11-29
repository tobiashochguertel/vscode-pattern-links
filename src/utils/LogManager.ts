import * as fs from 'fs';
import * as path from 'path';

export class LogManager {
    private messageQueue: string[] = [];
    private logPath: string;
    private testMode: boolean = false;
    private maxQueueSize: number = 100;
    private lastMessage: string = '';

    constructor(logPath: string, testMode: boolean = false) {
        this.logPath = logPath;
        this.testMode = testMode;
    }

    public isTestMode(): boolean {
        return this.testMode;
    }

    private async ensureLogDirectoryExists(): Promise<void> {
        const logDir = path.dirname(this.logPath);
        try {
            await fs.promises.mkdir(logDir, { recursive: true });
        } catch (error) {
            console.error('Error creating log directory:', error);
            throw error;
        }
    }

    public async write(message: string): Promise<void> {
        if (!message.endsWith('\n')) {
            message += '\n';
        }

        // Add timestamp only if not already present
        if (!message.startsWith('[20')) {  // Simple check for ISO timestamp
            const timestamp = new Date().toISOString();
            message = `[${timestamp}] ${message}`;
        }

        // Prevent duplicate messages
        const messageWithoutTimestamp = message.replace(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] /, '');
        if (messageWithoutTimestamp === this.lastMessage) {
            return;
        }
        this.lastMessage = messageWithoutTimestamp;

        // In test mode, write immediately
        if (this.testMode) {
            await this.ensureLogDirectoryExists();
            await fs.promises.appendFile(this.logPath, message);
            return;
        }

        // Otherwise, add to queue
        this.messageQueue.push(message);
        if (this.messageQueue.length >= this.maxQueueSize) {
            await this.flush();
        }
    }

    private async flush(): Promise<void> {
        if (this.messageQueue.length === 0) {
            return;
        }

        try {
            await this.ensureLogDirectoryExists();
            const messages = this.messageQueue.splice(0, this.messageQueue.length);
            await fs.promises.appendFile(this.logPath, messages.join(''));
        } catch (error) {
            console.error('Error writing to log file:', error);
            throw error;
        }
    }
}
