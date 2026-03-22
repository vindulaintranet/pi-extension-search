/**
 * pi-extension-search
 * Created by Fabio Rizzo Matos
 * GitHub: https://github.com/fabiorizzomatos
 * Contact: fabiorizzo@vindula.com.br
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
  BRAVE_API_KEY_ENV,
  EXA_API_KEY_ENV,
  braveSearch,
  buildErrorResult,
  buildResultsText,
  ensureEnvFromPiSettings,
  exaSearch,
  truncateOutput,
} from "./search-core";

export type { SearchResult } from "./search-core";
export {
  BRAVE_API_KEY_ENV,
  EXA_API_KEY_ENV,
  braveSearch,
  buildErrorResult,
  buildResultsText,
  ensureEnvFromPiSettings,
  exaSearch,
  truncateOutput,
} from "./search-core";

export default function searchToolsExtension(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ensureEnvFromPiSettings(EXA_API_KEY_ENV, ctx.cwd);
    ensureEnvFromPiSettings(BRAVE_API_KEY_ENV, ctx.cwd);
  });

  pi.registerTool({
    name: "exa_search",
    label: "Exa Search",
    description: "Search the web with Exa (requires EXA_API_KEY).",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      numResults: Type.Optional(Type.Integer({ description: "Number of results (1-20)", minimum: 1, maximum: 20 })),
      searchType: Type.Optional(Type.String({ description: "Search type (neural/keyword)" })),
      includeDomains: Type.Optional(Type.Array(Type.String())),
      excludeDomains: Type.Optional(Type.Array(Type.String())),
      useAutoprompt: Type.Optional(Type.Boolean({ description: "Enable autoprompt" })),
    }),
    async execute(_id, params, signal, _onUpdate, ctx: ExtensionContext) {
      try {
        const { results } = await exaSearch({
          query: params.query,
          numResults: params.numResults,
          searchType: params.searchType,
          includeDomains: params.includeDomains,
          excludeDomains: params.excludeDomains,
          useAutoprompt: params.useAutoprompt,
          cwd: ctx.cwd,
          signal,
        });
        const text = truncateOutput(buildResultsText("exa", params.query, results));
        return {
          content: [{ type: "text", text }],
          details: { source: "exa", query: params.query, results },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return buildErrorResult(message);
      }
    },
  });

  pi.registerTool({
    name: "brave_search",
    label: "Brave Search",
    description: "Search the web with Brave Search (requires BRAVE_API_KEY).",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      count: Type.Optional(Type.Integer({ description: "Number of results (1-20)", minimum: 1, maximum: 20 })),
      searchLang: Type.Optional(Type.String({ description: "Search language (for example: en-US)" })),
      country: Type.Optional(Type.String({ description: "Country code (for example: US)" })),
      safeSearch: Type.Optional(Type.String({ description: "off/moderate/strict" })),
    }),
    async execute(_id, params, signal, _onUpdate, ctx: ExtensionContext) {
      try {
        const { results } = await braveSearch({
          query: params.query,
          count: params.count,
          searchLang: params.searchLang,
          country: params.country,
          safeSearch: params.safeSearch,
          cwd: ctx.cwd,
          signal,
        });
        const text = truncateOutput(buildResultsText("brave", params.query, results));
        return {
          content: [{ type: "text", text }],
          details: { source: "brave", query: params.query, results },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return buildErrorResult(message);
      }
    },
  });
}
