import { beforeEach, describe, expect, it, vi } from "vitest";

// Shared mock — all instances created by extractFilterWithClaude use this
const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

const { extractFilterWithClaude } = await import("../../nlp/providers/claude.js");

function makeToolUseMessage(input: Record<string, unknown>) {
  return {
    content: [{ type: "tool_use", id: "tool_abc", name: "extract_filter", input }],
  };
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe("extractFilterWithClaude", () => {
  it("extracts language from tool use response", async () => {
    mockCreate.mockResolvedValue(makeToolUseMessage({ language: "Python" }));
    const filter = await extractFilterWithClaude("Python repos");
    expect(filter.language).toBe("Python");
  });

  it("extracts department", async () => {
    mockCreate.mockResolvedValue(makeToolUseMessage({ department: "HMRC" }));
    const filter = await extractFilterWithClaude("repos from HMRC");
    expect(filter.department).toBe("HMRC");
  });

  it("extracts dependencies array", async () => {
    mockCreate.mockResolvedValue(makeToolUseMessage({ dependencies: ["react", "webpack"] }));
    const filter = await extractFilterWithClaude("repos using react and webpack");
    expect(filter.dependencies).toEqual(["react", "webpack"]);
  });

  it("extracts activeOnly flag", async () => {
    mockCreate.mockResolvedValue(makeToolUseMessage({ activeOnly: true }));
    const filter = await extractFilterWithClaude("active repos");
    expect(filter.activeOnly).toBe(true);
  });

  it("extracts minStars and rounds to integer", async () => {
    mockCreate.mockResolvedValue(makeToolUseMessage({ minStars: 100.9 }));
    const filter = await extractFilterWithClaude("repos with more than 100 stars");
    expect(filter.minStars).toBe(101);
  });

  it("returns empty filter when no tool_use block is present", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "I cannot parse this." }] });
    const filter = await extractFilterWithClaude("???");
    expect(filter).toEqual({});
  });

  it("extracts a combined filter", async () => {
    mockCreate.mockResolvedValue(
      makeToolUseMessage({
        language: "TypeScript",
        department: "GDS",
        activeOnly: true,
        minStars: 50,
      })
    );
    const filter = await extractFilterWithClaude(
      "active TypeScript repos from GDS with more than 50 stars"
    );
    expect(filter).toMatchObject({
      language: "TypeScript",
      department: "GDS",
      activeOnly: true,
      minStars: 50,
    });
  });

  it("filters out non-string entries in dependencies array", async () => {
    mockCreate.mockResolvedValue(
      makeToolUseMessage({ dependencies: ["react", 42, null, "redux"] })
    );
    const filter = await extractFilterWithClaude("repos using react and redux");
    expect(filter.dependencies).toEqual(["react", "redux"]);
  });
});
