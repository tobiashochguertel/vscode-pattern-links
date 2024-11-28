import { LinkDefinitionProvider } from "./LinkDefinitionProvider";
import { Rule } from "./config";

export class FileUrlLinkDefinitionProvider extends LinkDefinitionProvider {
  constructor(pattern?: string, flags?: string, targetTemplate?: string) {
    super(pattern, flags, targetTemplate);
  }

  protected override createUri(matchText: string, rule: Rule): string {
    console.log(`[FileUrlLinkDefinitionProvider.createUri] Original matchText:`, matchText);

    // Handle @document tag
    if (matchText.startsWith("@document")) {
      matchText = matchText.replace(/@document\s+/, "");
      if (!matchText.startsWith("file://")) {
        matchText = "file://" + matchText;
      }
      console.log(`[FileUrlLinkDefinitionProvider.createUri] After @document handling:`, matchText);

      // For @document tags, we want to return the file URI directly
      return matchText;
    }

    // Let the parent class handle capture group replacement
    const uri = super.createUri(matchText, rule);
    if (!uri) return "";
    console.log(`[FileUrlLinkDefinitionProvider.createUri] After parent createUri:`, uri);

    // Now encode any remaining spaces in the path part
    const match = uri.match(/^(file:\/\/)(.*)$/);
    console.log(`[FileUrlLinkDefinitionProvider.createUri] URI parts match:`, match);

    if (match?.length === 3) {
      const protocol = match[1] ?? "";
      let path = match[2] ?? "";
      console.log(`[FileUrlLinkDefinitionProvider.createUri] Protocol:`, protocol);
      console.log(`[FileUrlLinkDefinitionProvider.createUri] Path:`, path);

      // First, decode any existing %20 to spaces to avoid double encoding
      path = decodeURIComponent(path);
      console.log("[FileUrlLinkDefinitionProvider.createUri] Decoded path:", path);

      // Then encode all special characters while preserving forward slashes
      const encodedPath = path.split('/').map(segment => {
        console.log("[FileUrlLinkDefinitionProvider.createUri] Processing segment:", segment);
        // Encode spaces as %20 and keep other special characters as is
        const encodedSegment = encodeURIComponent(segment).replace(/%2F/g, '/');
        console.log("[FileUrlLinkDefinitionProvider.createUri] Encoding encodedSegment:", encodedSegment);
        return encodedSegment;
      }).join('/');
      console.log("[FileUrlLinkDefinitionProvider.createUri] Encoded path:", encodedPath);

      // Remove any trailing slashes
      const cleanPath = encodedPath.replace(/\/+$/, "");
      console.log(`[FileUrlLinkDefinitionProvider.createUri] Cleaned path:`, cleanPath);
      const result = `${protocol}${cleanPath}`;
      console.log(`[FileUrlLinkDefinitionProvider.createUri] Final result with encoded spaces:`, result);

      return result;
    }

    // Remove any trailing slashes from the final URI
    const cleanUri = uri.replace(/\/+$/, "");
    console.log(`[FileUrlLinkDefinitionProvider.createUri] Returning cleaned URI:`, cleanUri);
    return cleanUri;
  }
}
