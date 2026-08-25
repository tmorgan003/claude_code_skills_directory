import { describe, expect, it } from "vitest";
import { extractInstallSnippet, extractPackageUrl, extractPurposeSummary, stripMarkdown } from "./extract";

describe("extractPurposeSummary", () => {
  it("uses the description verbatim when present", () => {
    expect(extractPurposeSummary("A tool for X", "# README\n\nSome other text.")).toBe("A tool for X");
  });

  it("falls back to the first meaningful README paragraph when description is missing", () => {
    const readme = "# Title\n\n![badge](x.png)\n\nThis package does something genuinely useful for developers.\n\nMore text.";
    expect(extractPurposeSummary(null, readme)).toBe(
      "This package does something genuinely useful for developers."
    );
  });

  it("truncates to ~160 chars without breaking mid-word", () => {
    const longParagraph = "word ".repeat(50).trim();
    const result = extractPurposeSummary(null, longParagraph);
    expect(result!.length).toBeLessThanOrEqual(161);
    expect(result!.endsWith("…")).toBe(true);
    expect(result![result!.length - 2]).not.toBe(" ");
  });

  it("returns null when there's nothing usable", () => {
    expect(extractPurposeSummary(null, null)).toBeNull();
    expect(extractPurposeSummary("", null)).toBeNull();
  });
});

describe("stripMarkdown", () => {
  it("removes headings, links, images, and code fences", () => {
    const md = "![alt](img.png) [link text](http://x.com) `code` normal text";
    expect(stripMarkdown(md)).toBe("link text code normal text");
  });

  it("preserves paragraph breaks (blank lines) between sections", () => {
    const md = "# Heading\n\nFirst paragraph.\n\nSecond paragraph.";
    expect(stripMarkdown(md)).toBe("Heading\n\nFirst paragraph.\n\nSecond paragraph.");
  });
});

describe("extractInstallSnippet", () => {
  it("prefers a code block under an Installation heading", () => {
    const readme = "# Foo\n\n```\nnpm install foo\n```\n\n## Installation\n\n```bash\nnpm install foo-real\n```\n";
    expect(extractInstallSnippet(readme)).toBe("npm install foo-real");
  });

  it("falls back to the first code block when there's no install heading", () => {
    const readme = "# Foo\n\n```bash\nnpm install foo\n```\n";
    expect(extractInstallSnippet(readme)).toBe("npm install foo");
  });

  it("returns null when there are no code blocks", () => {
    expect(extractInstallSnippet("# Foo\n\nNo code here.")).toBeNull();
  });
});

describe("extractPackageUrl", () => {
  it("detects npm install", () => {
    expect(extractPackageUrl("npm install @scope/thing")).toEqual({
      url: "https://www.npmjs.com/package/@scope/thing",
      manager: "npm",
    });
  });

  it("detects npx", () => {
    expect(extractPackageUrl("npx my-cli")).toEqual({
      url: "https://www.npmjs.com/package/my-cli",
      manager: "npm",
    });
  });

  it("detects pip install", () => {
    expect(extractPackageUrl("pip install my-package")).toEqual({
      url: "https://pypi.org/project/my-package/",
      manager: "pypi",
    });
  });

  it("prefers npm when both patterns are present", () => {
    expect(extractPackageUrl("pip install foo\nnpm install bar")!.manager).toBe("npm");
  });

  it("returns null when nothing matches", () => {
    expect(extractPackageUrl("just some text")).toBeNull();
    expect(extractPackageUrl(null)).toBeNull();
  });
});
