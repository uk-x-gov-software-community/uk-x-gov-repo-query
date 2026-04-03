import { describe, expect, it } from "vitest";
import { isEmptyFilter } from "../nlp/llm.js";

describe("isEmptyFilter", () => {
  it("returns true for an empty filter object", () => {
    expect(isEmptyFilter({})).toBe(true);
  });

  it("returns false when language is set", () => {
    expect(isEmptyFilter({ language: "Python" })).toBe(false);
  });

  it("returns false when department is set", () => {
    expect(isEmptyFilter({ department: "HMRC" })).toBe(false);
  });

  it("returns false when activeOnly is set", () => {
    expect(isEmptyFilter({ activeOnly: true })).toBe(false);
  });

  it("returns false when minStars is set", () => {
    expect(isEmptyFilter({ minStars: 10 })).toBe(false);
  });

  it("returns false when name is set", () => {
    expect(isEmptyFilter({ name: "govuk" })).toBe(false);
  });

  it("returns true when dependencies is an empty array", () => {
    expect(isEmptyFilter({ dependencies: [] })).toBe(true);
  });

  it("returns false when dependencies has entries", () => {
    expect(isEmptyFilter({ dependencies: ["react"] })).toBe(false);
  });

  it("returns true when topics is an empty array", () => {
    expect(isEmptyFilter({ topics: [] })).toBe(true);
  });

  it("returns false when topics has entries", () => {
    expect(isEmptyFilter({ topics: ["python"] })).toBe(false);
  });

  it("returns false for a fully-populated filter", () => {
    expect(
      isEmptyFilter({
        language: "TypeScript",
        department: "GDS",
        dependencies: ["react"],
        activeOnly: true,
        minStars: 50,
      })
    ).toBe(false);
  });
});
