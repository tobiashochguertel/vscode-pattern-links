import * as assert from "assert";
import * as vscode from "vscode";
import { LinkDefinitionProvider } from "../../src/LinkDefinitionProvider";

suite("LinkDefinitionProvider", () => {
  test("Matches patterns to return links", async () => {
    const links = await new LinkDefinitionProvider(
      "FOO-\\d+",
      "",
      "https://example.com/$0"
    ).provideDocumentLinks({
      getText() {
        return "FOO-123 FOO-0";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });
    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO-123"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/FOO-0"
    );
  });

  test("Capture groups work", async () => {
    const links = await new LinkDefinitionProvider(
      "(FOO|BAR)-(\\d+)",
      "",
      "https://example.com/$1/$2?foo=bar"
    ).provideDocumentLinks({
      getText() {
        return "FOO-123 BAR-3";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });
    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO/123?foo=bar"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/BAR/3?foo=bar"
    );
  });

  test("Escape characters prevent substitution", async () => {
    const links = await new LinkDefinitionProvider(
      "(FOO|BAR)-(\\d+)",
      "",
      "https://example.com/\\$1/$2?foo=bar"
    ).provideDocumentLinks({
      getText() {
        return "FOO-123 BAR-3";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });
    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/$1/123?foo=bar"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/$1/3?foo=bar"
    );
  });

  test("Failed substitutions result in input remaining untouched (not 'undefined' in output)", async () => {
    const links = await new LinkDefinitionProvider(
      "(FOO|BAR)-(\\d+)",
      "",
      "https://example.com/$1/$4"
    ).provideDocumentLinks({
      getText() {
        return "FOO-123 BAR-3";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });
    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO/$4"
    );
  });

  test("No matches return empty array", async () => {
    const links = await new LinkDefinitionProvider(
      "NONEXISTENT-\d+",
      "",
      "https://example.com/$0"
    ).provideDocumentLinks({
      getText() {
        return "FOO-123 BAR-3";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });
    assert.equal(links?.length, 0);
  });

  test("Complex pattern with multiple capture groups", async () => {
    const links = await new LinkDefinitionProvider(
      "(FOO|BAR)-(\\d+)-(\\w+)",
      "",
      "https://example.com/$1/$2/$3"
    ).provideDocumentLinks({
      getText() {
        return "FOO-123-abc BAR-456-def";
      },
      positionAt() {
        return new vscode.Position(0, 0);
      },
    });
    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO/123/abc"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/BAR/456/def"
    );
  });

  suite("Config: `rule.linkPatternFlags`", () => {
    test("`g` flag cannot be overwritten", async () => {
      const links = await new LinkDefinitionProvider(
        "(FOO|BAR)-(\\d+)",
        "i", // `i` here does not stop the usual `g` flag from taking effect
        "https://example.com/$1/$4"
      ).provideDocumentLinks({
        getText() {
          return "FOO-123 BAR-3";
        },
        positionAt() {
          return new vscode.Position(0, 0);
        },
      });
      assert.equal((links?.length ?? 0) > 1, true);
    });

    test("Single flags work", async () => {
      const links = await new LinkDefinitionProvider(
        "(BAR)-(\\d+)",
        "i", // `i` here does not stop the usual `g` flag from taking effect
        "https://example.com/$1/$2"
      ).provideDocumentLinks({
        getText() {
          return "BAR-3 bar-72";
        },
        positionAt() {
          return new vscode.Position(0, 0);
        },
      });
      assert.equal(links?.length, 2);
      assert.equal(
        links?.[0]?.target?.toString(true),
        "https://example.com/BAR/3"
      );
      assert.equal(
        links?.[1]?.target?.toString(true),
        "https://example.com/bar/72"
      );
    });

    test("Multiple flags work", async () => {
      const testWithFlag = (flags: string) => {
        return new LinkDefinitionProvider(
          "start(.*?)end",
          flags,
          "https://example.com/$1"
        ).provideDocumentLinks({
          getText() {
            return "startsome stuff\nnewline\nandmoreend";
          },
          positionAt() {
            return new vscode.Position(0, 0);
          },
        });
      };

      // No flag (g is added automatically)
      assert.equal((await testWithFlag(""))?.length, 0);

      // Individual flags (g is added automatically)
      assert.equal((await testWithFlag("i"))?.length, 0);
      assert.equal((await testWithFlag("s"))?.length, 1); // s flag allows . to match newlines

      // Combined flags (g is added automatically)
      assert.equal((await testWithFlag("is"))?.length, 1);
      assert.equal(
        (await testWithFlag("is"))?.[0]?.target?.toString(true),
        "https://example.com/some stuff\nnewline\nandmore"
      );
    });
  });
});
