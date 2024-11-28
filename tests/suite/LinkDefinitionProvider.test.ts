import * as assert from "assert";
import { LinkDefinitionProvider } from "../../src/LinkDefinitionProvider";
import { MockTextDocument } from "./mock/MockTextDocument";

suite("LinkDefinitionProvider", () => {
  test("Matches patterns to return links", async () => {
    const links = await new LinkDefinitionProvider(
      "FOO-\\d+",
      "",
      "https://example.com/$0"
    ).provideDocumentLinks(new MockTextDocument("FOO-123 FOO-0"));

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
      "FOO-(\\d+)",
      "",
      "https://example.com/FOO/$1?foo=bar"
    ).provideDocumentLinks(new MockTextDocument("FOO-123 FOO-0"));

    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO/123?foo=bar"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/FOO/0?foo=bar"
    );
  });

  test("Escaped capture groups work", async () => {
    const links = await new LinkDefinitionProvider(
      "FOO-(\\d+)",
      "",
      "https://example.com/\\$1/$1?foo=bar"
    ).provideDocumentLinks(new MockTextDocument("FOO-123 FOO-0"));

    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/$1/123?foo=bar"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/$1/0?foo=bar"
    );
  });

  test("Non-existent capture groups are preserved", async () => {
    const links = await new LinkDefinitionProvider(
      "FOO-(\\d+)",
      "",
      "https://example.com/FOO/$4"
    ).provideDocumentLinks(new MockTextDocument("FOO-123 FOO-0"));

    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO/$4"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/FOO/$4"
    );
  });

  test("No matches returns empty array", async () => {
    const links = await new LinkDefinitionProvider(
      "BAR-\\d+",
      "",
      "https://example.com/$0"
    ).provideDocumentLinks(new MockTextDocument("FOO-123 FOO-0"));

    assert.equal(links?.length, 0);
  });

  test("Complex pattern with multiple capture groups", async () => {
    const links = await new LinkDefinitionProvider(
      "FOO-(\\d+)-(\\w+)",
      "",
      "https://example.com/FOO/$1/$2"
    ).provideDocumentLinks(new MockTextDocument("FOO-123-abc FOO-0-def"));

    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO/123/abc"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/FOO/0/def"
    );
  });

  test("Pattern with no capture groups", async () => {
    const links = await new LinkDefinitionProvider(
      "FOO",
      "",
      "https://example.com/FOO"
    ).provideDocumentLinks(new MockTextDocument("FOO FOO"));

    assert.equal((links?.length ?? 0) > 1, true);
  });

  test("Single flags work", async () => {
    const links = await new LinkDefinitionProvider(
      "bar-\\d+",
      "i",
      "https://example.com/BAR/$0"
    ).provideDocumentLinks(new MockTextDocument("BAR-3 bar-4"));

    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/BAR/BAR-3"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/BAR/bar-4"
    );
  });

  test("Multiple flags work", async () => {
    const testWithFlag = async (flags: string) => {
      return await new LinkDefinitionProvider(
        "FOO-\\d+",
        flags,
        "https://example.com/$0"
      ).provideDocumentLinks(new MockTextDocument("FOO-123 FOO-0"));
    };

    // No flag (g is added automatically)
    assert.equal((await testWithFlag(""))?.length, 2);

    // Individual flags (g is added automatically)
    assert.equal((await testWithFlag("i"))?.length, 2);
    assert.equal((await testWithFlag("s"))?.length, 2);
    assert.equal((await testWithFlag("m"))?.length, 2);

    // Multiple flags (g is added automatically)
    assert.equal((await testWithFlag("ism"))?.length, 2);
  });
});
