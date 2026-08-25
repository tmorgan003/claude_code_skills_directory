import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("serializes plain rows with a header", () => {
    const csv = toCsv([{ a: 1, b: "x" }, { a: 2, b: "y" }]);
    expect(csv).toBe("a,b\n1,x\n2,y");
  });

  it("escapes commas, quotes, and newlines", () => {
    const csv = toCsv([{ name: 'a "quoted", value', desc: "line1\nline2" }]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,desc");
    expect(csv).toContain('"a ""quoted"", value"');
    expect(csv).toContain('"line1\nline2"');
  });

  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});
