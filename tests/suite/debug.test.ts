import * as assert from 'assert';
import { suite, test, after, before, beforeEach } from 'mocha';
import * as vscode from 'vscode';
import { debugManager } from '../../src/utils/DebugManager';
import { Rule } from '../../src/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileLogWriter } from '../../src/utils/FileLogWriter';

// Mock vscode.extensions.getExtension
const originalGetExtension = vscode.extensions.getExtension;
vscode.extensions.getExtension = (extensionId: string) => {
    if (extensionId === 'TobiasHochguertel.pattern-links-fork') {
        return {
            extensionPath: path.join(process.cwd(), 'test-extension')
        } as vscode.Extension<any>;
    }
    return originalGetExtension(extensionId);
};

suite('Debug Tests', () => {
    let logFilePath: string;
    const testWorkspaceDir = path.join(os.tmpdir(), 'pattern-links-test');

    // Set up test cleanup
    after(async () => {
        // Clean up test workspace
        await fs.promises.rm(testWorkspaceDir, { recursive: true, force: true });
        // Restore original getExtension
        vscode.extensions.getExtension = originalGetExtension;
    });

    // Set up test directory before tests
    before(async () => {
        // Set up test workspace
        await fs.promises.mkdir(testWorkspaceDir, { recursive: true });
        const logsDir = path.join(testWorkspaceDir, 'logs');
        await fs.promises.mkdir(logsDir, { recursive: true });

        logFilePath = path.join(logsDir, 'pattern-links-debug.log');
        await fs.promises.writeFile(logFilePath, '');

        // Reset debug manager instance to use new test directory
        debugManager['logFilePath'] = logFilePath;

        // Initialize log writer in test mode
        const writer = new FileLogWriter(logFilePath, true);
        debugManager['logWriter'] = writer;
    });

    // Clear log file and reset debug state before each test
    beforeEach(async () => {
        // Create logs directory
        const logsDir = path.dirname(logFilePath);
        await fs.promises.mkdir(logsDir, { recursive: true });

        // Clear log file
        await fs.promises.writeFile(logFilePath, '');

        // Reset debug instance and logging state
        debugManager['enabled'] = false;
        debugManager['fileLoggingEnabled'] = false;
        const writer = new FileLogWriter(logFilePath, true);
        debugManager['logWriter'] = writer;
    });

    test('Debug mode toggle', async () => {
        // Initially debug should be disabled
        assert.strictEqual(debugManager.isDebugEnabled(), false);

        // Toggle debug on
        debugManager.toggleDebug();
        assert.strictEqual(debugManager.isDebugEnabled(), true);

        // Toggle debug off
        debugManager.toggleDebug();
        assert.strictEqual(debugManager.isDebugEnabled(), false);
    });

    test('File logging toggle', async () => {
        // Initially file logging should be disabled
        assert.strictEqual(debugManager.isFileLoggingEnabled(), false);

        // Toggle file logging on
        debugManager.toggleFileLogging();

        // Verify file logging is enabled
        assert.strictEqual(debugManager.isFileLoggingEnabled(), true);

        // Get log file path
        const logPath = debugManager.getLogFilePath();
        assert.ok(logPath, 'Log file path should be defined');

        // Verify log directory exists
        const logDir = path.dirname(logPath);
        assert.ok(fs.existsSync(logDir), 'Log directory should exist');

        // Write a test log message
        await debugManager.log('Test log message');

        // Verify log file exists and contains the message
        assert.ok(fs.existsSync(logPath), 'Log file should exist');
        const logContent = fs.readFileSync(logPath, 'utf8');
        assert.ok(logContent.includes('Test log message'), 'Log file should contain test message');

        // Toggle file logging off
        debugManager.toggleFileLogging();
        assert.strictEqual(debugManager.isFileLoggingEnabled(), false);
    });

    test('Debug hover message with description', () => {
        const rule: Rule = {
            linkPattern: 'test-pattern',
            linkTarget: 'test-target',
            description: 'Test description'
        };
        const text = 'test-text';
        const uri = 'test-uri';

        const hoverMessage = debugManager.getHoverMessage(text, rule, uri);

        assert.ok(hoverMessage.includes('Test description'), 'Hover message should include description');
        assert.ok(hoverMessage.includes('test-pattern'), 'Hover message should include pattern');
        assert.ok(hoverMessage.includes('test-target'), 'Hover message should include target');
        assert.ok(hoverMessage.includes('test-uri'), 'Hover message should include URI');
    });

    test('Debug hover message without description', () => {
        const rule: Rule = {
            linkPattern: 'test-pattern',
            linkTarget: 'test-target'
        };
        const text = 'test-text';
        const uri = 'test-uri';

        const hoverMessage = debugManager.getHoverMessage(text, rule, uri);

        assert.ok(!hoverMessage.includes('Description:'), 'Hover message should not include description field');
        assert.ok(hoverMessage.includes('test-pattern'), 'Hover message should include pattern');
        assert.ok(hoverMessage.includes('test-target'), 'Hover message should include target');
        assert.ok(hoverMessage.includes('test-uri'), 'Hover message should include URI');
    });

    test('Debug logging with description', async () => {
        // Enable file logging only
        debugManager.toggleFileLogging();

        // Clear log file after enabling logging
        await fs.promises.writeFile(logFilePath, '');

        const rule: Rule = {
            linkPattern: 'test-pattern',
            linkTarget: 'test-target',
            description: 'Test description'
        };

        await debugManager.logLinkCreation('test-text', rule, 'test-uri');

        // Read and verify log file content
        const logContent = fs.readFileSync(logFilePath, 'utf8');
        console.log('Log file contents:', logContent);
        const lines = logContent.split('\n').filter(line => line.length > 0);
        console.log('Log lines:', lines);

        // There should be exactly one log entry
        assert.strictEqual(lines.length, 1, 'Should have exactly one log entry');

        // Get the log line, fail if undefined
        const logLine = lines[0];
        assert.ok(logLine, 'Log line should not be undefined');

        // Verify log content
        assert.ok(logLine.includes('Link created'), 'Log should contain "Link created"');
        assert.ok(logLine.includes('Text: test-text'), 'Log should contain text');
        assert.ok(logLine.includes('Pattern: test-pattern'), 'Log should contain pattern');
        assert.ok(logLine.includes('Target: test-target'), 'Log should contain target');
        assert.ok(logLine.includes('Description: Test description'), 'Log should contain description');
        assert.ok(logLine.includes('Final URI: test-uri'), 'Log should contain URI');
    });

    test('Debug logging without description', async () => {
        // Enable file logging only
        debugManager.toggleFileLogging();

        // Clear log file after enabling logging
        await fs.promises.writeFile(logFilePath, '');

        const rule: Rule = {
            linkPattern: 'test-pattern',
            linkTarget: 'test-target'
        };

        await debugManager.logLinkCreation('test-text', rule, 'test-uri');

        // Read and verify log file content
        const logContent = fs.readFileSync(logFilePath, 'utf8');
        const lines = logContent.split('\n').filter(line => line.length > 0);

        // There should be exactly one log entry
        assert.strictEqual(lines.length, 1, 'Should have exactly one log entry');

        // Get the log line, fail if undefined
        const logLine = lines[0];
        assert.ok(logLine, 'Log line should not be undefined');

        // Verify log content
        assert.ok(logLine.includes('Link created'), 'Log should contain "Link created"');
        assert.ok(logLine.includes('Text: test-text'), 'Log should contain text');
        assert.ok(logLine.includes('Pattern: test-pattern'), 'Log should contain pattern');
        assert.ok(logLine.includes('Target: test-target'), 'Log should contain target');
        assert.ok(!logLine.includes('Description:'), 'Log should not contain description');
        assert.ok(logLine.includes('Final URI: test-uri'), 'Log should contain URI');
    });
});
