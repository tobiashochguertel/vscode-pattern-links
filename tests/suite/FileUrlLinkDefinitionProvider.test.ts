import * as assert from "assert";
import * as vscode from "vscode";
import { LinkDefinitionProvider } from "../../src/LinkDefinitionProvider";

suite("FileUrlLinkDefinitionProvider", () => {
  test("Matches file:// URLs", async () => {
    const links = await new LinkDefinitionProvider(
      "file://(/[^ \n]*(?:%20[^ \n]*)*)",
      "",
      "file://$1"
    ).provideDocumentLinks({
      getText() {
        return "file:///path/to/file.txt some text";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });

    assert.equal(links?.length, 1);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "file:///path/to/file.txt"
    );
  });

  test("Matches multiple file:// URLs in one line", async () => {
    const links = await new LinkDefinitionProvider(
      "file://(/[^ \n]*(?:%20[^ \n]*)*)(?=\\s|$)",
      "",
      "file://$1"
    ).provideDocumentLinks({
      getText() {
        return "file:///path/one.txt file:///path/two.txt";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });

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
    const links = await new LinkDefinitionProvider(
      "file://(/[^\n]+)",
      "",
      "file://$1"
    ).provideDocumentLinks({
      getText() {
        return "file:///path/with spaces/file.txt";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });

    assert.equal(links?.length, 1);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "file:///path/with%20spaces/file.txt"
    );
  });

  test("Matches file:// URLs in multiline text", async () => {
    const links = await new LinkDefinitionProvider(
      "file://(/[^ \n]*(?:%20[^ \n]*)*)(?=\\s|$)",
      "s",
      "file://$1"
    ).provideDocumentLinks({
      getText() {
        return `Some text here
file:///path/to/file1.txt
More text
file:///path/to/file2.txt
End text`;
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });

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
    const links = await new LinkDefinitionProvider(
      "file://([.][^ \n]*(?:%20[^ \n]*)*|/(?:[^ \n]*(?:%20[^ \n]*)*)*)",
      "",
      "file://$1"
    ).provideDocumentLinks({
      getText() {
        return "file://./relative/path.txt file://../parent/path.txt";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });

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
    const links = await new LinkDefinitionProvider(
      "file://(/[^ \n]*(?:%20[^ \n]*)*)",
      "",
      "file://$1"
    ).provideDocumentLinks({
      getText() {
        return "file:// file://invalid/|path file://";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });

    assert.equal(links?.length, 0);
  });

  test("Matches file:// URLs in JSDoc @document tags", async () => {
    const links = await new LinkDefinitionProvider(
      "@document (.*?)(?=\\s|$)",
      "",
      "file://$1"
    ).provideDocumentLinks({
      getText() {
        return `
    /**
     * **MD030**: Spaces after list markers
     *
     * @document ../../../../external-repositories/markdownlint-main/doc/md030.md
     */`;
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });

    assert.equal(links?.length, 1);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "file://../../../../external-repositories/markdownlint-main/doc/md030.md"
    );
  });
});
