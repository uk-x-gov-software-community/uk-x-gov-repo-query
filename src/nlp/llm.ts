import type { QueryFilter } from "../types.js";

export type LlmProviderName = "copilot" | "claude";

/** Returns true when the filter has no usable criteria. */
export function isEmptyFilter(filter: QueryFilter): boolean {
  return (
    filter.name === undefined &&
    filter.language === undefined &&
    filter.department === undefined &&
    filter.activeOnly === undefined &&
    filter.minStars === undefined &&
    (filter.dependencies === undefined || filter.dependencies.length === 0) &&
    (filter.topics === undefined || filter.topics.length === 0)
  );
}

/**
 * Use an LLM provider to extract a QueryFilter from a natural language query.
 *
 * Both providers are optional peer dependencies — a clear error is thrown if
 * the relevant package is not installed.
 *
 * @param query   The raw natural language query string.
 * @param provider  "claude" uses @anthropic-ai/sdk with tool use for reliable
 *                  structured output. "copilot" uses @github/copilot-sdk and
 *                  parses JSON from the model response.
 */
export async function extractFilterWithLlm(
  query: string,
  provider: LlmProviderName
): Promise<QueryFilter> {
  switch (provider) {
    case "claude": {
      const { extractFilterWithClaude } = await import("./providers/claude.js");
      return extractFilterWithClaude(query);
    }
    case "copilot": {
      const { extractFilterWithCopilot } = await import("./providers/copilot.js");
      return extractFilterWithCopilot(query);
    }
  }
}
