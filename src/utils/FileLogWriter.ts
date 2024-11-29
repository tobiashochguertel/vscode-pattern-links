import * as fs from 'fs';
import * as path from 'path';
import { IFileLogger } from './IFileLogger';

/**
 * Handles writing log messages to files with features like queuing, rotation, and duplicate prevention.
 *
 * @remarks
 * The FileLogWriter implements a queue-based logging system that:
 * - Buffers messages to reduce I/O operations
 * - Handles file rotation based on size
 * - Provides test mode for immediate writes
 * - Ensures proper message formatting with timestamps
 *
 * @example
 * ```typescript
 * const writer = new FileLogWriter('/path/to/log.txt');
 * await writer.write('Log message');  // Message is queued
 * await writer.flushQueue();          // Write all queued messages
 * ```
 */
export class FileLogWriter implements IFileLogger {
    private messageQueue: string[] = [];
    private lastMessage: string = '';
    private readonly maxQueueSize: number;
    private readonly maxFileSize: number;

    /**
     * Creates a new FileLogWriter instance.
     *
     * @param logPath - The full path to the log file
     * @param testMode - If true, messages are written immediately instead of being queued
     * @param maxQueueSize - Maximum number of messages to queue before forcing a flush (default: 100)
     * @param maxFileSize - Maximum size of log file in bytes before rotation (default: 5MB)
     */
    constructor(
        private readonly logPath: string,
        private readonly testMode: boolean = false,
        maxQueueSize: number = 100,
        maxFileSize: number = 5 * 1024 * 1024 // Default 5MB
    ) {
        this.maxQueueSize = maxQueueSize;
        this.maxFileSize = maxFileSize;
    }

    /**
     * Checks if the logger is running in test mode.
     * In test mode, messages are written immediately instead of being queued.
     *
     * @returns True if running in test mode, false otherwise
     */
    public isTestMode(): boolean {
        return this.testMode;
    }

    /**
     * Ensures the log directory exists, creating it if necessary.
     *
     * @throws Error if directory creation fails due to permissions or disk space
     */
    public async ensureLogDirectoryExists(): Promise<void> {
        const dir = path.dirname(this.logPath);
        try {
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
        } catch (error) {
            this.handleFileError(error, 'creating log directory', dir);
        }
    }

    /**
     * Rotates the log file if it exceeds the maximum size.
     * The old file is renamed with a timestamp suffix.
     *
     * @throws Error if file operations fail due to permissions or disk space
     */
    public async rotateLogFileIfNeeded(): Promise<void> {
        try {
            const stats = await fs.promises.stat(this.logPath);
            if (stats.size >= this.maxFileSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupPath = `${this.logPath}.${timestamp}`;
                await fs.promises.rename(this.logPath, backupPath);
                await fs.promises.writeFile(this.logPath, '');  // Create new empty file
            }
        } catch (error) {
            // Ignore ENOENT as it just means the file doesn't exist yet
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
                return;
            }
            this.handleFileError(error, 'rotating log file', this.logPath);
        }
    }

    /**
     * Writes a message to the log file.
     *
     * @remarks
     * The message is processed as follows:
     * 1. Timestamp is added if not present
     * 2. Newline is added if not present
     * 3. Duplicate messages are filtered out
     * 4. In test mode: written immediately
     * 5. In normal mode: added to queue and flushed if queue is full
     *
     * @param message - The message to log
     * @throws Error if file operations fail in test mode
     */
    public async write(message: string): Promise<void> {
        // Add timestamp if not already present
        if (!message.startsWith('[20')) {  // Simple check for ISO timestamp
            const timestamp = new Date().toISOString();
            message = `[${timestamp}] ${message}`;
        }

        // Ensure message ends with newline
        if (!message.endsWith('\n')) {
            message += '\n';
        }

        // Prevent duplicate messages by comparing without timestamp
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

        // Add to queue
        this.messageQueue.push(message);

        // Check if we need to flush the queue
        if (this.messageQueue.length >= this.maxQueueSize) {
            await this.flushQueue();
        }
    }

    /**
     * Writes all queued messages to the log file.
     *
     * @remarks
     * This method:
     * 1. Checks if the log directory exists
     * 2. Rotates the log file if needed
     * 3. Writes all queued messages
     * 4. Clears the queue on success
     *
     * @throws Error if file operations fail
     */
    public async flushQueue(): Promise<void> {
        if (this.messageQueue.length === 0) {
            return;
        }

        try {
            await this.ensureLogDirectoryExists();
            await this.rotateLogFileIfNeeded();

            // Write all messages to file
            const content = this.messageQueue.join('\n') + '\n';
            await fs.promises.appendFile(this.logPath, content, 'utf8');

            // Clear the queue after successful write
            this.clearQueue();
        } catch (error) {
            console.error('Error flushing log queue:', error);
            this.handleFileError(error, 'writing to log file', this.logPath);
        }
    }

    /**
     * Clears the message queue and last message tracking.
     * This is typically called after a successful flush operation.
     */
    public clearQueue(): void {
        this.messageQueue = [];
        this.lastMessage = '';
    }

    /**
     * Handles file system errors with detailed error messages.
     *
     * @param error - The error to handle
     * @param operation - Description of the operation that failed
     * @param path - The file or directory path involved
     * @throws Error with detailed message based on the error type
     */
    private handleFileError(error: unknown, operation: string, path: string): never {
        if (error && typeof error === 'object' && 'code' in error) {
            switch (error.code) {
                case 'EACCES':  // Permission denied
                    throw new Error(`Permission denied ${operation}: ${path}`);
                case 'EPERM':   // Operation not permitted
                    throw new Error(`Operation not permitted ${operation}: ${path}`);
                case 'EBUSY':   // File is locked
                    throw new Error(`File is locked or in use ${operation}: ${path}`);
                case 'EMFILE':  // Too many open files
                    throw new Error(`Too many open files, cannot ${operation}: ${path}`);
                case 'ENOSPC':  // No space left on device
                    throw new Error(`No disk space available ${operation}: ${path}`);
                case 'ENOENT':  // File or directory not found
                    throw new Error(`File or directory not found ${operation}: ${path}`);
                default:
                    throw error;
            }
        }
        throw error;
    }
}
