import { debugManager } from "./DebugManager";

interface LoopMetrics {
    startTime: number;
    iterations: number;
    lastMatchPosition: number;
    samePositionCount: number;
    matchesInTimeWindow: number;
    lastWindowStart: number;
}

/**
 * Detects and prevents infinite or problematic loops in pattern matching
 */
export class LoopDetector {
    private static readonly MAX_ITERATIONS = 10000;
    private static readonly MAX_EXECUTION_TIME = 5000; // 5 seconds
    private static readonly MAX_SAME_POSITION = 5;
    private static readonly MAX_MATCHES_PER_SECOND = 1000;
    private static readonly TIME_WINDOW = 1000; // 1 second

    private static metrics = new Map<string, LoopMetrics>();

    /**
     * Start monitoring a new pattern matching operation
     */
    public static startMonitoring(documentUri: string, pattern: string): void {
        const key = `${documentUri}|${pattern}`;
        this.metrics.set(key, {
            startTime: Date.now(),
            iterations: 0,
            lastMatchPosition: -1,
            samePositionCount: 0,
            matchesInTimeWindow: 0,
            lastWindowStart: Date.now()
        });
    }

    /**
     * Check if the current operation might be in an infinite loop
     * @returns true if operation should continue, false if it should stop
     */
    public static checkIteration(documentUri: string, pattern: string, matchPosition: number): boolean {
        const key = `${documentUri}|${pattern}`;
        const metrics = this.metrics.get(key);
        
        if (!metrics) {
            debugManager.log(`No metrics found for ${key}`);
            return false;
        }

        metrics.iterations++;
        const now = Date.now();
        const executionTime = now - metrics.startTime;

        // Check for same position matches (potential infinite loop)
        if (matchPosition === metrics.lastMatchPosition) {
            metrics.samePositionCount++;
        } else {
            metrics.samePositionCount = 0;
        }
        metrics.lastMatchPosition = matchPosition;

        // Check rate of matches in time window
        if (now - metrics.lastWindowStart >= this.TIME_WINDOW) {
            metrics.matchesInTimeWindow = 0;
            metrics.lastWindowStart = now;
        }
        metrics.matchesInTimeWindow++;

        // Check for various loop conditions
        const conditions = [
            { 
                check: metrics.iterations > this.MAX_ITERATIONS,
                message: `Too many iterations (${metrics.iterations})`
            },
            {
                check: executionTime > this.MAX_EXECUTION_TIME,
                message: `Execution time exceeded (${executionTime}ms)`
            },
            {
                check: metrics.samePositionCount > this.MAX_SAME_POSITION,
                message: `Too many matches at same position (${matchPosition})`
            },
            {
                check: metrics.matchesInTimeWindow > this.MAX_MATCHES_PER_SECOND,
                message: `Too many matches per second (${metrics.matchesInTimeWindow})`
            }
        ];

        for (const condition of conditions) {
            if (condition.check) {
                this.logPotentialInfiniteLoop(documentUri, pattern, condition.message, metrics);
                return false;
            }
        }

        return true;
    }

    /**
     * Log details about a potential infinite loop
     */
    private static logPotentialInfiniteLoop(
        documentUri: string, 
        pattern: string, 
        reason: string,
        metrics: LoopMetrics
    ): void {
        debugManager.log('\n=== Potential Infinite Loop Detected ===');
        debugManager.log(`Document: ${documentUri}`);
        debugManager.log(`Pattern: ${pattern}`);
        debugManager.log(`Reason: ${reason}`);
        debugManager.log('\nMetrics:');
        debugManager.log(`- Iterations: ${metrics.iterations}`);
        debugManager.log(`- Execution Time: ${Date.now() - metrics.startTime}ms`);
        debugManager.log(`- Same Position Count: ${metrics.samePositionCount}`);
        debugManager.log(`- Matches in Time Window: ${metrics.matchesInTimeWindow}`);
        debugManager.log(`- Last Match Position: ${metrics.lastMatchPosition}`);
    }

    /**
     * Clean up monitoring for a pattern
     */
    public static stopMonitoring(documentUri: string, pattern: string): void {
        const key = `${documentUri}|${pattern}`;
        this.metrics.delete(key);
    }

    /**
     * Clear all monitoring data
     */
    public static clearAll(): void {
        this.metrics.clear();
    }
}
