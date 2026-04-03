import { beforeEach, describe, expect, it, vi } from "vitest";

// sendAndWait is defined on the session, so we keep a ref to configure it
const mockSendAndWait = vi.fn();

vi.mock("@github/copilot-sdk", () => {
  return {
    CopilotClient: class MockCopilotClient {
      createSession = vi.fn().mockResolvedValue({
        sendAndWait: mockSendAndWait,
      });
    },
  };
});

const { extractFilterWithCopilot } = await import("../../nlp/providers/copilot.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractFilterWithCopilot", () => {
  it("parses a plain JSON string response", async () => {
    mockSendAndWait.mockResolvedValue('{"language":"Python","department":"HMRC"}');
    const filter = await extractFilterWithCopilot("Python repos from HMRC");
    expect(filter).toMatchObject({ language: "Python", department: "HMRC" });
  });

  it("parses a response wrapped in an object with a content field", async () => {
    mockSendAndWait.mockResolvedValue({
      content: '{"language":"TypeScript","activeOnly":true}',
    });
    const filter = await extractFilterWithCopilot("active TypeScript repos");
    expect(filter).toMatchObject({ language: "TypeScript", activeOnly: true });
  });

  it("strips markdown code fences from the response", async () => {
    mockSendAndWait.mockResolvedValue('```json\n{"language":"Ruby","minStars":20}\n```');
    const filter = await extractFilterWithCopilot("Ruby repos with 20+ stars");
    expect(filter).toMatchObject({ language: "Ruby", minStars: 20 });
  });

  it("returns empty filter when JSON cannot be parsed", async () => {
    mockSendAndWait.mockResolvedValue("Sorry, I cannot help with that.");
    const filter = await extractFilterWithCopilot("???");
    expect(filter).toEqual({});
  });

  it("extracts dependencies array", async () => {
    mockSendAndWait.mockResolvedValue('{"dependencies":["django","celery"]}');
    const filter = await extractFilterWithCopilot("repos using django and celery");
    expect(filter.dependencies).toEqual(["django", "celery"]);
  });

  it("rounds non-integer minStars values", async () => {
    mockSendAndWait.mockResolvedValue('{"minStars":99.7}');
    const filter = await extractFilterWithCopilot("repos with many stars");
    expect(filter.minStars).toBe(100);
  });

  it("extracts a combined filter", async () => {
    mockSendAndWait.mockResolvedValue(
      '{"language":"Go","department":"GCHQ","activeOnly":true,"minStars":5}'
    );
    const filter = await extractFilterWithCopilot(
      "active Go repos from GCHQ with more than 5 stars"
    );
    expect(filter).toMatchObject({
      language: "Go",
      department: "GCHQ",
      activeOnly: true,
      minStars: 5,
    });
  });
});
