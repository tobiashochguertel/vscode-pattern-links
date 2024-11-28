import * as vscode from 'vscode';

export class TextProcessor {
    private static readonly CHUNK_SIZE = 50000; // 50KB chunks
    private static regexCache = new Map<string, RegExp>();

    /**
     * Gets or creates a cached RegExp instance
     */
    public static getRegExp(pattern: string, flags: string): RegExp {
        const key = `${pattern}|${flags}`;
        let regex = this.regexCache.get(key);
        
        if (!regex) {
            regex = new RegExp(pattern, flags);
            this.regexCache.set(key, regex);
        }
        
        return regex;
    }

    /**
     * Process text in chunks to avoid memory issues with large files
     */
    public static *getTextChunks(document: vscode.TextDocument): Generator<{ text: string; offset: number }> {
        const fullText = document.getText();
        const textLength = fullText.length;
        
        for (let i = 0; i < textLength; i += this.CHUNK_SIZE) {
            const chunk = fullText.slice(i, i + this.CHUNK_SIZE);
            yield { text: chunk, offset: i };
        }
    }

    /**
     * Clear the regex cache
     */
    public static clearCache(): void {
        this.regexCache.clear();
    }
}
