import type { QueryFilter } from "../../types.js";

/**
 * Minimal structural types for the parts of @anthropic-ai/sdk we use.
 * Defined inline so the SDK is a true optional peer dependency — TypeScript
 * is satisfied at compile time; the real types are used at runtime when the
 * package is installed.
 */
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description: string; items?: { type: string } }>;
  };
}

interface AnthropicContentBlock {
  type: string;
  input?: Record<string, unknown>;
}

interface AnthropicMessage {
  content: AnthropicContentBlock[];
}

interface AnthropicClient {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      tools: AnthropicTool[];
      tool_choice: { type: string };
      messages: Array<{ role: string; content: string }>;
    }): Promise<AnthropicMessage>;
  };
}

interface AnthropicModule {
  default: new () => AnthropicClient;
}

const EXTRACT_TOOL: AnthropicTool = {
  name: "extract_filter",
  description:
    "Extract repository search filter criteria from a natural language query about UK government open source repositories.",
  input_schema: {
    type: "object",
    properties: {
      language: {
        type: "string",
        description: "Programming language, e.g. Python, TypeScript, Ruby",
      },
      department: {
        type: "string",
        description:
          "UK government department, agency, or organisation name or abbreviation, e.g. HMRC, GDS, Home Office",
      },
      dependencies: {
        type: "array",
        items: { type: "string" },
        description: "Library or package names the repositories should use, e.g. react, django",
      },
      activeOnly: {
        type: "boolean",
        description: "True when the user only wants active (non-archived) repositories",
      },
      minStars: {
        type: "integer",
        description: "Minimum number of GitHub stars",
      },
      name: {
        type: "string",
        description: "Substring to match against the repository name",
      },
    },
  },
};

/**
 * Use the Anthropic Claude API (@anthropic-ai/sdk) to extract a QueryFilter
 * from a natural language query. Uses tool use for reliable structured output.
 *
 * Requires ANTHROPIC_API_KEY environment variable.
 */
export async function extractFilterWithClaude(query: string): Promise<QueryFilter> {
  let mod: AnthropicModule;
  try {
    mod = (await import("@anthropic-ai/sdk")) as AnthropicModule;
  } catch {
    throw new Error(
      "@anthropic-ai/sdk is not installed. Run: npm install @anthropic-ai/sdk",
    );
  }

  const client = new mod.default();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: query }],
  });

  const toolUse = message.content.find((c) => c.type === "tool_use");
  if (toolUse?.type !== "tool_use" || toolUse.input === undefined) return {};

  return inputToFilter(toolUse.input);
}

function inputToFilter(input: Record<string, unknown>): QueryFilter {
  const filter: QueryFilter = {};

  if (typeof input.language === "string") filter.language = input.language;
  if (typeof input.department === "string") filter.department = input.department;
  if (typeof input.name === "string") filter.name = input.name;
  if (typeof input.activeOnly === "boolean") filter.activeOnly = input.activeOnly;
  if (typeof input.minStars === "number") filter.minStars = Math.round(input.minStars);
  if (Array.isArray(input.dependencies)) {
    filter.dependencies = input.dependencies.filter(
      (d): d is string => typeof d === "string",
    );
  }

  return filter;
}
