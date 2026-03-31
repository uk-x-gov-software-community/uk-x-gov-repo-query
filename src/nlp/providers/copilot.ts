import type { QueryFilter } from "../../types.js";

/**
 * Minimal structural types for the parts of @github/copilot-sdk we use.
 * Defined inline so the SDK is a true optional peer dependency.
 */
interface CopilotSession {
  sendAndWait(params: { prompt: string }): Promise<unknown>;
}

interface CopilotClientInstance {
  createSession(params: { model: string }): Promise<CopilotSession>;
}

interface CopilotModule {
  CopilotClient: new () => CopilotClientInstance;
}

const PROMPT_PREFIX = `You are a query parser for a UK government open source repository search tool.
Extract search criteria from the user's query and respond with ONLY a JSON object.

The JSON may contain these fields (omit any not mentioned):
- "language": programming language name (string)
- "department": UK government department, agency, or org name/abbreviation (string)
- "dependencies": library or package names (array of strings)
- "activeOnly": true if only active/non-archived repos are wanted (boolean)
- "minStars": minimum star count (integer)
- "name": repository name substring to match (string)

Respond with ONLY the JSON object — no markdown fences, no explanation.

Query: `;

/**
 * Use the GitHub Copilot SDK (@github/copilot-sdk) to extract a QueryFilter.
 * Parses structured JSON from the model's text response.
 *
 * Requires GitHub Copilot CLI to be installed and authenticated.
 */
export async function extractFilterWithCopilot(query: string): Promise<QueryFilter> {
  let mod: CopilotModule;
  try {
    mod = (await import("@github/copilot-sdk")) as CopilotModule;
  } catch {
    throw new Error(
      "@github/copilot-sdk is not installed. Run: npm install @github/copilot-sdk\n" +
        "Also ensure the GitHub Copilot CLI is installed and authenticated.",
    );
  }

  const client = new mod.CopilotClient();
  const session = await client.createSession({ model: "gpt-4.1" });
  const response = await session.sendAndWait({ prompt: PROMPT_PREFIX + query });

  return parseResponse(response);
}

/** Extract JSON from the model response, handling various response shapes. */
function parseResponse(response: unknown): QueryFilter {
  // The SDK response may be a plain string, or an object with a content/text field
  let text = "";

  if (typeof response === "string") {
    text = response;
  } else if (response !== null && typeof response === "object") {
    const r = response as Record<string, unknown>;
    if (typeof r.content === "string") text = r.content;
    else if (typeof r.text === "string") text = r.text;
    else if (typeof r.message === "string") text = r.message;
    else text = JSON.stringify(response);
  }

  // Strip markdown code fences if the model added them
  const jsonText = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    return inputToFilter(parsed);
  } catch {
    return {};
  }
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
