import { LinkDefinitionProvider } from "./LinkDefinitionProvider";
import { Rule } from "./config";
import { debugManager } from "./utils/DebugManager";
import { getConfig } from "./config";

export class FileUrlLinkDefinitionProvider extends LinkDefinitionProvider {
  constructor(pattern?: string, flags?: string, targetTemplate?: string) {
    super(pattern, flags, targetTemplate);
    if (debugManager.isDebugEnabled()) {
      debugManager.log('\n=== FileUrl Provider Initialization ===');
      debugManager.log(`Pattern: ${pattern ?? 'undefined'}`);
      debugManager.log(`Flags: ${flags ?? 'undefined'}`);
      debugManager.log(`Target Template: ${targetTemplate ?? 'undefined'}`);

      const config = getConfig();
      const fileUrlRules = config.rules.filter(r =>
        r.linkTarget.startsWith('file://') ||
        r.linkPattern.includes('@document')
      );

      debugManager.log('\n=== FileUrl Provider Configuration ===');
      debugManager.log('File URL Rules:');
      fileUrlRules.forEach((rule, index) => {
        debugManager.log(`Rule ${index + 1}:`);
        debugManager.log(`  Pattern: ${rule.linkPattern}`);
        debugManager.log(`  Flags: ${rule.linkPatternFlags || 'none'}`);
        debugManager.log(`  Target: ${rule.linkTarget}`);
        if (rule.description) {
          debugManager.log(`  Description: ${rule.description}`);
        }
      });
    }
  }

  protected override createUri(matchText: string, rule: Rule): string {
    if (debugManager.isDebugEnabled()) {
      debugManager.log(`Processing file URL match text: "${matchText}"`);
      debugManager.log(`Using pattern: "${rule.linkPattern}"`);
      debugManager.log(`Target template: "${rule.linkTarget}"`);
    }

    // Let the parent class handle capture group replacement
    const uri = super.createUri(matchText, rule);
    if (!uri) {
      if (debugManager.isDebugEnabled()) {
        debugManager.log(`No file URI generated for match text`);
      }
      return "";
    }

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`Generated file URI: ${uri}`);
      if (uri.startsWith('file://')) {
        debugManager.log(`File path: ${uri.slice(7)}`);
      }
    }

    return uri;
  }
}
