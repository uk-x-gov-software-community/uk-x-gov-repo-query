import type { QueryFilter } from "../types.js";

export interface Rule {
  /** Pattern matched against the full query string. */
  pattern: RegExp;
  /** Mutate the filter in-place based on the match. */
  apply: (match: RegExpMatchArray, filter: QueryFilter) => void;
}

/**
 * Ordered list of NL parsing rules. Each rule is tried against the full
 * query string; all matching rules contribute to the filter (AND semantics).
 * Add new rules here to extend the query language.
 */
export const rules: Rule[] = [
  // --- Activity ---
  {
    pattern: /\b(active|not\s+archived|live)\b/i,
    apply: (_match, filter) => {
      filter.activeOnly = true;
    },
  },

  // --- Stars ---
  // "more than N stars", "at least N stars", "over N stars"
  {
    pattern: /\b(?:more\s+than|at\s+least|over)\s+(\d+)\s*stars?\b/i,
    apply: (match, filter) => {
      filter.minStars = parseInt(match[1]!, 10);
    },
  },
  // "N+ stars"
  {
    pattern: /\b(\d+)\+\s*stars?\b/i,
    apply: (match, filter) => {
      filter.minStars = parseInt(match[1]!, 10);
    },
  },
  // "N or more stars"
  {
    pattern: /\b(\d+)\s+or\s+more\s+stars?\b/i,
    apply: (match, filter) => {
      filter.minStars = parseInt(match[1]!, 10);
    },
  },

  // --- Language (explicit patterns) ---
  // "written in X"
  {
    pattern: /\bwritten\s+in\s+(\w+)\b/i,
    apply: (match, filter) => {
      filter.language = match[1]!;
    },
  },
  // "X repos", "X code", "X language", "X projects"
  {
    pattern: /\b(\w+)\s+(?:repos?|code|language|projects?)\b/i,
    apply: (match, filter) => {
      if (filter.language === undefined) {
        filter.language = match[1]!;
      }
    },
  },

  // --- Department ---
  // "from X [repos|projects|...]" — capture 1–3 words before an optional
  // phrase-terminating keyword or end of input
  {
    pattern:
      /\bfrom\s+((?:\w[\w-]*(?:\s+(?!repos?|projects?|code|that|which|written|using|built|with|and|or\b)[\w-]+)*))(?=\s+(?:repos?|projects?|code|that|which|written|using|built|and|or)\b|[,;.]|$)/i,
    apply: (match, filter) => {
      filter.department = match[1]!.trim();
    },
  },
  // "by X"
  {
    pattern:
      /\bby\s+((?:\w[\w-]*(?:\s+(?!repos?|projects?|code|that|which|written|using|built|with|and|or\b)[\w-]+)*))(?=\s+(?:repos?|projects?|code|that|which|written|using|built|and|or)\b|[,;.]|$)/i,
    apply: (match, filter) => {
      filter.department = match[1]!.trim();
    },
  },

  // --- Dependencies ---
  // "using X"
  {
    pattern: /\busing\s+([\w@/.-]+)\b/i,
    apply: (match, filter) => {
      const dep = match[1]!.toLowerCase();
      filter.dependencies = [...(filter.dependencies ?? []), dep];
    },
  },
  // "built with X"
  {
    pattern: /\bbuilt\s+with\s+([\w@/.-]+)\b/i,
    apply: (match, filter) => {
      const dep = match[1]!.toLowerCase();
      filter.dependencies = [...(filter.dependencies ?? []), dep];
    },
  },
  // "that use(s) X"
  {
    pattern: /\bthat\s+uses?\s+([\w@/.-]+)\b/i,
    apply: (match, filter) => {
      const dep = match[1]!.toLowerCase();
      filter.dependencies = [...(filter.dependencies ?? []), dep];
    },
  },
];
