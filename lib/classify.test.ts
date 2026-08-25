import { describe, expect, it } from "vitest";
import { classifyCategory, classifyType } from "./classify";

describe("classifyType", () => {
  it("classifies SKILL.md at root as a skill, even when topics suggest mcp_server", () => {
    const result = classifyType({
      fullName: "foo/mcp-server-thing",
      topics: ["mcp-server"],
      rootFiles: ["SKILL.md", "package.json"],
      subfolderHasSkillMd: false,
    });
    expect(result).toBe("skill");
  });

  it("classifies a subfolder SKILL.md as a skill", () => {
    const result = classifyType({
      fullName: "foo/bar",
      topics: [],
      rootFiles: ["package.json"],
      subfolderHasSkillMd: true,
    });
    expect(result).toBe("skill");
  });

  it("requires both mcp-shaped name AND a manifest file for mcp_server", () => {
    expect(
      classifyType({
        fullName: "foo/my-mcp-server",
        topics: [],
        rootFiles: ["mcp.json"],
        subfolderHasSkillMd: false,
      })
    ).toBe("mcp_server");

    expect(
      classifyType({
        fullName: "foo/my-mcp-server",
        topics: [],
        rootFiles: ["package.json"],
        subfolderHasSkillMd: false,
      })
    ).toBe("unclassified");
  });

  it("falls back to explicit topic tags", () => {
    expect(
      classifyType({ fullName: "foo/bar", topics: ["claude-skill"], rootFiles: [], subfolderHasSkillMd: false })
    ).toBe("skill");
    expect(
      classifyType({ fullName: "foo/bar", topics: ["mcp-server"], rootFiles: [], subfolderHasSkillMd: false })
    ).toBe("mcp_server");
  });

  it("returns unclassified when no signal matches", () => {
    expect(
      classifyType({ fullName: "foo/bar", topics: [], rootFiles: ["README.md"], subfolderHasSkillMd: false })
    ).toBe("unclassified");
  });
});

describe("classifyCategory", () => {
  it("matches security keywords", () => {
    expect(classifyCategory("A tool for secret scanning and vulnerability auth")).toBe("security");
  });

  it("matches data keywords", () => {
    expect(classifyCategory("Connects to a postgres database")).toBe("data");
  });

  it("resolves first-match-wins when text matches two rules", () => {
    // "security" rule is checked before "data" rule.
    expect(classifyCategory("A security tool for postgres databases")).toBe("security");
  });

  it("falls back to other when nothing matches", () => {
    expect(classifyCategory("A whimsical repository about nothing in particular")).toBe("other");
  });
});
