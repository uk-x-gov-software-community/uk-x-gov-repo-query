import type { QueryFilter } from "../types.js";
import { rules } from "./rules.js";

/**
 * Parse a natural language query string into a structured QueryFilter.
 *
 * Each rule is tested against the full query string in order. All matching
 * rules contribute their criteria to the filter (AND semantics). Unrecognised
 * parts of the query are silently ignored.
 *
 * @example
 * parseQuery("active Python repos from HMRC using django")
 * // → { activeOnly: true, language: "Python", department: "HMRC", dependencies: ["django"] }
 */
export function parseQuery(query: string): QueryFilter {
  const filter: QueryFilter = {};
  for (const rule of rules) {
    const match = rule.pattern.exec(query);
    if (match !== null) {
      rule.apply(match, filter);
    }
  }
  return filter;
}
