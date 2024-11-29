import * as vscode from "vscode";
import type { PartialDeep } from "type-fest";

/** Name of the extension used for configuration namespace */
export const EXTENSION_NAME = "patternlinks";

/** Available log levels for debug configuration */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Debug configuration interface for controlling logging behavior
 */
export interface DebugConfig {
  /** Whether debug mode is enabled */
  enabled: boolean;

  /** Whether to write logs to a file */
  fileLogging: boolean;

  /** The current log level */
  logLevel: LogLevel;

  /** Maximum size of log file in megabytes */
  logFileMaxSize: number;

  /** Maximum number of log messages to queue before dropping */
  maxQueueSize: number;

  /** Optional custom path for log file. If empty, uses default location */
  customLogPath: string;
}

/**
 * Rule interface for defining link patterns and their behavior
 * @example
 * ```json
 * {
 *   "linkPattern": "@document\\s+(.*)",
 *   "linkTarget": "file://$1",
 *   "linkPatternFlags": "i",
 *   "languages": ["markdown"],
 *   "description": "Converts @document tags to file links"
 * }
 * ```
 */
export interface Rule {
  /**
   * The pattern to match in the document text.
   * For file links, you can use patterns like "@document\\s+(.*)" to capture paths.
   * @example "@document\\s+(.*)" - Matches "@document" followed by a path
   */
  linkPattern: string;

  /**
   * Optional flags for the link pattern regex.
   * The 'g' (global) flag is automatically added if not present.
   * Common flags: 'i' for case-insensitive
   * @example "i" - Case-insensitive matching (will become "gi")
   * @default "" - Empty string (will become "g")
   */
  linkPatternFlags?: string;

  /**
   * The target URI template. Can use capture groups from linkPattern ($1, $2, etc).
   * For file links, use "file://$1" to convert captured paths to file URIs.
   * @example "file://$1" - Converts captured path to file URI
   */
  linkTarget: string;

  /**
   * Optional array of language IDs where this rule should apply.
   * Use ["*"] for all languages.
   * @example ["markdown", "typescript"] - Apply only in markdown and typescript files
   */
  languages?: string[];

  /**
   * Optional description of what the rule does
   * @example "Converts @document tags to file links"
   */
  description?: string;  // Optional description of what the rule does
}

/**
 * Main configuration interface for the extension
 */
export interface Config {
  /** Array of rules for pattern matching and link generation */
  rules: Rule[];

  /** Debug configuration settings */
  debug: DebugConfig;
}

/** Default debug configuration values */
const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  enabled: false,
  fileLogging: false,
  logLevel: 'info',
  logFileMaxSize: 5,
  maxQueueSize: 100,
  customLogPath: ''
};

/**
 * Gets the current configuration for the extension
 * @returns {Config} The current configuration with default values applied
 */
export function getConfig(): Config {
  const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
  const debugConfig = config.get<Partial<DebugConfig>>('debug', {});

  return {
    rules: (config.get<PartialDeep<Rule>[]>('rules') ?? []).flatMap((rule) => {
      let {
        linkPattern,
        linkTarget,
        linkPatternFlags,
        languages = [],
        description,
      } = rule ?? {};

      // If required values are missing, filter this entire
      // rule out.
      if (!linkPattern || !linkTarget) {
        return [];
      }

      // No language defined means all languages.
      if (!languages.length) {
        languages = ["*"];
      }

      return {
        linkPattern,
        linkTarget,
        linkPatternFlags,
        description,
        // Remove null / undefined
        languages: languages.flatMap((language) => {
          return !language ? [] : language;
        }),
      };
    }),
    debug: {
      ...DEFAULT_DEBUG_CONFIG,
      ...debugConfig
    }
  };
}
