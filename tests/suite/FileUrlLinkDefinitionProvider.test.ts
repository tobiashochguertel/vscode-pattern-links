import * as assert from "assert";
import { FileUrlLinkDefinitionProvider } from "../../src/FileUrlLinkDefinitionProvider";
import { MockTextDocument } from "./mock/MockTextDocument";

suite("FileUrlLinkDefinitionProvider", () => {
  test("Matches file:// URLs", async () => {
    const links = await new FileUrlLinkDefinitionProvider(
      "file://(/[^ \n]*(?:%20[^ \n]*)*)",
      "",
      "file://$1"
    ).provideDocumentLinks(new MockTextDocument("file:///path/to/file.txt some text"));

    assert.equal(links?.length, 1);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "file:///path/to/file.txt"
    );
  });

  test("Matches multiple file:// URLs in one line", async () => {
    const links = await new FileUrlLinkDefinitionProvider(
      "file://(/[^ \n]*(?:%20[^ \n]*)*)(?=\\s|$)",
      "",
      "file://$1"
    ).provideDocumentLinks(new MockTextDocument("file:///path/one.txt file:///path/two.txt"));

    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "file:///path/one.txt"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "file:///path/two.txt"
    );
  });

  test("Matches file:// URLs with spaces in path", async () => {
    console.log("Matches file:// URLs with spaces in path - START");
    const links = await new FileUrlLinkDefinitionProvider(
      "file:\/\/(\/[^ \n]*(?:[ %20][^ \n]*)*)",
      "",
      "file://$1"
    ).provideDocumentLinks(new MockTextDocument("file:///path/with spaces/file.txt"));

    console.log("Matches file:// URLs with spaces in path - links: ", links?.[0]);

    assert.equal(links?.length, 1);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "file:///path/with%20spaces/file.txt"
    );
    console.log("Matches file:// URLs with spaces in path - END");
  });

  test("Matches file:// URLs in multiline text", async () => {
    const links = await new FileUrlLinkDefinitionProvider(
      "file://(/[^ \n]*(?:%20[^ \n]*)*)(?=\\s|$)",
      "s",
      "file://$1"
    ).provideDocumentLinks(new MockTextDocument(`Some text here
file:///path/to/file1.txt
More text
file:///path/to/file2.txt
End text`));

    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "file:///path/to/file1.txt"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "file:///path/to/file2.txt"
    );
  });

  test("Handles relative file:// paths", async () => {
    const links = await new FileUrlLinkDefinitionProvider(
      "file://([.][^ \n]*(?:%20[^ \n]*)*|/(?:[^ \n]*(?:%20[^ \n]*)*)*)",
      "",
      "file://$1"
    ).provideDocumentLinks(new MockTextDocument("file://./relative/path.txt file://../parent/path.txt"));

    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "file://./relative/path.txt"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "file://../parent/path.txt"
    );
  });

  test("No matches for invalid file:// URLs", async () => {
    const links = await new FileUrlLinkDefinitionProvider(
      "file://(/[^ \n]*(?:%20[^ \n]*)*)",
      "",
      "file://$1"
    ).provideDocumentLinks(new MockTextDocument("file:// file://invalid/|path file://"));

    assert.equal(links?.length, 0);
  });

  test("Matches file:// URLs in JSDoc @document tags", async () => {
    const links = await new FileUrlLinkDefinitionProvider(
      "@document (.*?)(?=\\s|$)",
      "",
      "file://$1"
    ).provideDocumentLinks(new MockTextDocument(`
    /**
     * **MD030**: Spaces after list markers
     *
     * @document /path/to/file.txt
     */`));

    assert.equal(links?.length, 1);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "file:///path/to/file.txt"
    );
  });
});
