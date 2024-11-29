import * as vscode from 'vscode';

export class TextProcessor {
    private static readonly CHUNK_SIZE = 50000; // 50KB chunks
    private static readonly MAX_MATCHES_PER_DOCUMENT = 1000; // Prevent excessive matches
    private static readonly DEBOUNCE_INTERVAL = 250; // ms
    private static regexCache = new Map<string, RegExp>();
    private static lastProcessed = new Map<string, number>();
    private static matchCounts = new Map<string, number>();

    /**
     * Validates a regex pattern to prevent problematic patterns
     * @throws Error if pattern is invalid or potentially problematic
     */
    private static validatePattern(pattern: string): void {
        // Check for empty pattern
        if (!pattern || pattern.trim().length === 0) {
            throw new Error('Empty pattern');
        }

        // Check for patterns that might cause catastrophic backtracking
        const problematicPatterns = [
            /(\w+)*\1/,    // Nested quantifiers
            /(.+)*\1/,     // Nested quantifiers with dot
            /(\w+)\1+/     // Backreference with quantifier (fixed capturing group)
        ];

        if (problematicPatterns.some(p => p.test(pattern))) {
            throw new Error('Pattern may cause catastrophic backtracking');
        }

        // Check pattern length
        if (pattern.length > 1000) {
            throw new Error('Pattern too long');
        }
    }

    /**
     * Gets or creates a cached RegExp instance
     * @throws Error if pattern is invalid or potentially problematic
     */
    public static getRegExp(pattern: string, flags: string): RegExp {
        this.validatePattern(pattern);
        
        const key = `${pattern}|${flags}`;
        let regex = this.regexCache.get(key);
        
        if (!regex) {
            try {
                regex = new RegExp(pattern, flags);
                this.regexCache.set(key, regex);
            } catch (error: unknown) {
                // Handle unknown error type safely
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Invalid regex pattern: ${message}`);
            }
        }
        
        return regex;
    }

    /**
     * Process text in chunks to avoid memory issues with large files
     * @param document The document to process
     * @param skipPatterns Optional array of patterns to skip (prevents recursive matching)
     */
    public static *getTextChunks(
        document: vscode.TextDocument,
        skipPatterns: string[] = []
    ): Generator<{ text: string; offset: number; canProcess: boolean }> {
        const docKey = document.uri.toString();
        const now = Date.now();
        const lastTime = this.lastProcessed.get(docKey) || 0;

        // Debounce document processing
        if (now - lastTime < this.DEBOUNCE_INTERVAL) {
            yield { text: "", offset: 0, canProcess: false };
            return;
        }

        // Reset match count for new document processing
        this.matchCounts.set(docKey, 0);
        this.lastProcessed.set(docKey, now);

        const fullText = document.getText();
        const textLength = fullText.length;
        
        // Skip processing if text contains any of the skip patterns
        if (skipPatterns.some(pattern => fullText.includes(pattern))) {
            yield { text: "", offset: 0, canProcess: false };
            return;
        }
        
        for (let i = 0; i < textLength; i += this.CHUNK_SIZE) {
            const chunk = fullText.slice(i, i + this.CHUNK_SIZE);
            yield { text: chunk, offset: i, canProcess: true };
        }
    }

    /**
     * Increment and check match count for a document
     * @returns boolean indicating if we should continue processing
     */
    public static shouldContinueMatching(document: vscode.TextDocument): boolean {
        const docKey = document.uri.toString();
        const currentCount = (this.matchCounts.get(docKey) || 0) + 1;
        this.matchCounts.set(docKey, currentCount);
        return currentCount <= this.MAX_MATCHES_PER_DOCUMENT;
    }

    /**
     * Clear all caches
     */
    public static clearCache(): void {
        this.regexCache.clear();
        this.lastProcessed.clear();
        this.matchCounts.clear();
    }
}
