import * as vscode from "vscode";
import { EXTENSION_NAME, getConfig } from "./config";
import { LinkDefinitionProvider } from "./LinkDefinitionProvider";
import { FileUrlLinkDefinitionProvider } from "./FileUrlLinkDefinitionProvider";
import { debugManager } from './debug';

let activeRules: vscode.Disposable[] = [];

export function activate(context: vscode.ExtensionContext): void {
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

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(EXTENSION_NAME)) {
      initFromConfig(context);
    }
  });
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
      rule.languages?.map((language) => ({ language })) ?? [{ scheme: 'file' }],
      provider
    );
  });

  for (const rule of activeRules) {
    context.subscriptions.push(rule);
  }
}
