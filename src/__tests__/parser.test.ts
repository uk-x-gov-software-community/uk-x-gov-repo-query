import { describe, expect, it } from "vitest";
import { parseQuery } from "../nlp/parser.js";

describe("parseQuery", () => {
  it("returns empty filter for empty string", () => {
    expect(parseQuery("")).toEqual({});
  });

  it("returns empty filter for unrecognised input", () => {
    expect(parseQuery("show me things")).toEqual({});
  });

  // --- Language ---
  it("parses language from 'written in X'", () => {
    expect(parseQuery("written in Python")).toMatchObject({ language: "Python" });
  });

  it("parses language from 'X repos'", () => {
    expect(parseQuery("TypeScript repos")).toMatchObject({ language: "TypeScript" });
  });

  it("parses language from 'X code'", () => {
    expect(parseQuery("ruby code")).toMatchObject({ language: "ruby" });
  });

  it("parses language from 'X projects'", () => {
    expect(parseQuery("Go projects")).toMatchObject({ language: "Go" });
  });

  // --- Department ---
  it("parses department from 'from X'", () => {
    expect(parseQuery("repos from HMRC")).toMatchObject({ department: "HMRC" });
  });

  it("parses multi-word department from 'from X Y'", () => {
    const filter = parseQuery("repos from Home Office");
    expect(filter.department).toBe("Home Office");
  });

  it("parses department from 'by X'", () => {
    expect(parseQuery("Python repos by GDS")).toMatchObject({ department: "GDS" });
  });

  // --- Dependencies ---
  it("parses dependency from 'using X'", () => {
    expect(parseQuery("repos using react")).toMatchObject({ dependencies: ["react"] });
  });

  it("parses dependency from 'built with X'", () => {
    expect(parseQuery("built with django")).toMatchObject({ dependencies: ["django"] });
  });

  it("parses dependency from 'that use X'", () => {
    expect(parseQuery("repos that use express")).toMatchObject({ dependencies: ["express"] });
  });

  it("parses dependency from 'that uses X'", () => {
    expect(parseQuery("a repo that uses flask")).toMatchObject({ dependencies: ["flask"] });
  });

  it("lowercases dependency names", () => {
    expect(parseQuery("using React")).toMatchObject({ dependencies: ["react"] });
  });

  it("accumulates multiple dependency rules", () => {
    const filter = parseQuery("using react built with webpack");
    expect(filter.dependencies).toEqual(expect.arrayContaining(["react", "webpack"]));
    expect(filter.dependencies).toHaveLength(2);
  });

  // --- Activity ---
  it("parses activeOnly from 'active'", () => {
    expect(parseQuery("active repos")).toMatchObject({ activeOnly: true });
  });

  it("parses activeOnly from 'not archived'", () => {
    expect(parseQuery("not archived repos")).toMatchObject({ activeOnly: true });
  });

  it("parses activeOnly from 'live'", () => {
    expect(parseQuery("live Python repos")).toMatchObject({ activeOnly: true });
  });

  // --- Stars ---
  it("parses minStars from 'more than N stars'", () => {
    expect(parseQuery("more than 50 stars")).toMatchObject({ minStars: 50 });
  });

  it("parses minStars from 'at least N stars'", () => {
    expect(parseQuery("at least 100 stars")).toMatchObject({ minStars: 100 });
  });

  it("parses minStars from 'over N stars'", () => {
    expect(parseQuery("over 200 stars")).toMatchObject({ minStars: 200 });
  });

  it("parses minStars from 'N+ stars'", () => {
    expect(parseQuery("10+ stars")).toMatchObject({ minStars: 10 });
  });

  it("parses minStars from 'N or more stars'", () => {
    expect(parseQuery("25 or more stars")).toMatchObject({ minStars: 25 });
  });

  // --- Combined ---
  it("parses a combined query", () => {
    const filter = parseQuery("active Python repos from HMRC using django more than 10 stars");
    expect(filter).toMatchObject({
      activeOnly: true,
      language: "Python",
      department: "HMRC",
      dependencies: ["django"],
      minStars: 10,
    });
  });

  it("parses language and department together", () => {
    const filter = parseQuery("TypeScript repos from GDS");
    expect(filter).toMatchObject({ language: "TypeScript", department: "GDS" });
  });
});
