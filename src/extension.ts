import * as vscode from "vscode";
import { EXTENSION_NAME, getConfig } from "./config";
import { LinkDefinitionProvider } from "./LinkDefinitionProvider";
import { FileUrlLinkDefinitionProvider } from "./FileUrlLinkDefinitionProvider";
import { debugManager } from './utils/DebugManager';
import { ApplicationLogger } from './utils/ApplicationLogger';

let activeRules: vscode.Disposable[] = [];
const applicationLogger = ApplicationLogger.getInstance();

export function activate(context: vscode.ExtensionContext): void {
  try {
    applicationLogger.registerDisposable(context);
    applicationLogger.logStartup();

    // Register debug command
    const debugCommand = vscode.commands.registerCommand('pattern-links.toggleDebug', () => {
      debugManager.toggleDebug();
    });

    // Register file logging command
    const fileLoggingCommand = vscode.commands.registerCommand('pattern-links.toggleFileLogging', () => {
      debugManager.toggleFileLogging();
    });

    context.subscriptions.push(debugCommand, fileLoggingCommand);

    initFromConfig(context);
    applicationLogger.logActivated(getConfig().rules.length);

    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(EXTENSION_NAME)) {
        try {
          initFromConfig(context);
          applicationLogger.logConfigurationReload(getConfig().rules.length);
        } catch (error) {
          applicationLogger.logError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
  } catch (error) {
    applicationLogger.logError(error instanceof Error ? error : new Error(String(error)));
    throw error;  // Re-throw to ensure VS Code knows about the activation failure
  }
}

function initFromConfig(context: vscode.ExtensionContext): void {
  const config = getConfig();

  for (const rule of activeRules) {
    rule.dispose();
  }

  activeRules = config.rules.map((rule) => {
    const provider = rule.linkPattern.startsWith('file://') || rule.linkTarget.startsWith('file://')
      ? new FileUrlLinkDefinitionProvider(
        rule.linkPattern,
        rule.linkPatternFlags,
        rule.linkTarget
      )
      : new LinkDefinitionProvider(
        rule.linkPattern,
        rule.linkPatternFlags,
        rule.linkTarget
      );

    return vscode.languages.registerDocumentLinkProvider(
      rule.languages && rule.languages.length > 0
        ? rule.languages
        : "*",
      provider
    );
  });

  for (const rule of activeRules) {
    context.subscriptions.push(rule);
  }
}

export function deactivate(): void {
  try {
    applicationLogger.logShutdown();

    for (const rule of activeRules) {
      rule.dispose();
    }
    activeRules = [];

    applicationLogger.logDeactivated();
  } catch (error) {
    applicationLogger.logError(error instanceof Error ? error : new Error(String(error)));
  } finally {
    applicationLogger.dispose();
  }
}
