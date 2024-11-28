import * as vscode from "vscode";
import type { PartialDeep } from "type-fest";

export const EXTENSION_NAME = "patternlinks";

export interface Rule {
  linkPattern: string;
  linkPatternFlags?: string;
  linkTarget: string;
  languages?: string[];
  description?: string;  // Optional description of what the rule does
}

export interface Config {
  rules: Rule[];
}

export function getConfig(): Config {
  const config: PartialDeep<Config> =
    vscode.workspace.getConfiguration().get(EXTENSION_NAME) ?? {};

  return {
    rules: (config.rules ?? []).flatMap((rule) => {
      let {
        linkPattern,
        linkTarget,
        linkPatternFlags = "",
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
  };
}
