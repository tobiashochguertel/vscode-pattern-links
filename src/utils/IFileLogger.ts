export interface IFileLogger {
    // Core file logging functionality
    write(message: string): Promise<void>;
    
    // File management
    ensureLogDirectoryExists(): Promise<void>;
    rotateLogFileIfNeeded(): Promise<void>;
    
    // Status checks
    isTestMode(): boolean;
    
    // Queue management
    flushQueue(): Promise<void>;
    clearQueue(): void;
}
