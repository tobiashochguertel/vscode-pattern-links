import { LinkDefinitionProvider } from "./LinkDefinitionProvider";
import { Rule } from "./config";
import { debugManager } from "./debug";
import { TextProcessor } from "./utils/TextProcessor";

export class FileUrlLinkDefinitionProvider extends LinkDefinitionProvider {
  constructor(pattern?: string, flags?: string, targetTemplate?: string) {
    super(pattern, flags, targetTemplate);
  }

  protected override createUri(matchText: string, rule: Rule): string {
    if (debugManager.isDebugEnabled()) {
      debugManager.log(`[FileUrl] Original matchText: ${matchText}`);
    }

    // Handle @document tag
    if (matchText.startsWith("@document")) {
      matchText = matchText.replace(/@document\s+/, "");
      if (!matchText.startsWith("file://")) {
        matchText = "file://" + matchText;
      }
      if (debugManager.isDebugEnabled()) {
        debugManager.log(`[FileUrl] After @document handling: ${matchText}`);
      }

      // For @document tags, we want to return the file URI directly
      return matchText;
    }

    // Let the parent class handle capture group replacement
    const uri = super.createUri(matchText, rule);
    if (!uri) return "";

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`[FileUrl] After parent createUri: ${uri}`);
    }

    // Get cached RegExp for file URI pattern
    const fileUriRegex = TextProcessor.getRegExp("^(file://)(.*?)$", "");
    const match = uri.match(fileUriRegex);

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`[FileUrl] URI parts match: ${JSON.stringify(match)}`);
    }

    if (match?.length === 3) {
      const protocol = match[1] ?? "";
      let path = match[2] ?? "";

      if (debugManager.isDebugEnabled()) {
        debugManager.log(`[FileUrl] Protocol: ${protocol}`);
        debugManager.log(`[FileUrl] Path: ${path}`);
      }

      // First, decode any existing %20 to spaces to avoid double encoding
      path = decodeURIComponent(path);
      if (debugManager.isDebugEnabled()) {
        debugManager.log(`[FileUrl] Decoded path: ${path}`);
      }

      // Then encode all special characters while preserving forward slashes
      const encodedPath = path.split('/').map(segment => {
        if (debugManager.isDebugEnabled()) {
          debugManager.log(`[FileUrl] Processing segment: ${segment}`);
        }

        // Encode spaces as %20 and keep other special characters as is
        const encodedSegment = encodeURIComponent(segment).replace(/%2F/g, '/');
        if (debugManager.isDebugEnabled()) {
          debugManager.log(`[FileUrl] Encoded segment: ${encodedSegment}`);
        }
        return encodedSegment;
      }).join('/');

      if (debugManager.isDebugEnabled()) {
        debugManager.log(`[FileUrl] Encoded path: ${encodedPath}`);
      }

      // Get cached RegExp for trailing slashes
      const trailingSlashRegex = TextProcessor.getRegExp("/+$", "");
      const cleanPath = encodedPath.replace(trailingSlashRegex, "");

      if (debugManager.isDebugEnabled()) {
        debugManager.log(`[FileUrl] Cleaned path: ${cleanPath}`);
      }

      const result = `${protocol}${cleanPath}`;
      if (debugManager.isDebugEnabled()) {
        debugManager.log(`[FileUrl] Final result: ${result}`);
      }

      return result;
    }

    // Remove any trailing slashes from the final URI using cached RegExp
    const trailingSlashRegex = TextProcessor.getRegExp("/+$", "");
    const cleanUri = uri.replace(trailingSlashRegex, "");

    if (debugManager.isDebugEnabled()) {
      debugManager.log(`[FileUrl] Returning cleaned URI: ${cleanUri}`);
    }
    return cleanUri;
  }
}
