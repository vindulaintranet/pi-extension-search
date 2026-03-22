import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  getAgentDir,
  truncateHead,
} from "@mariozechner/pi-coding-agent";

type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

const EXA_API_URL = "https://api.exa.ai/search";
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
const EXA_API_KEY_ENV = "EXA_API_KEY";
const BRAVE_API_KEY_ENV = "BRAVE_API_KEY";

function readJsonFileIfExists(filePath: string): unknown | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function getEnvFromSettingsObject(settings: unknown, varName: string): string | undefined {
  if (!settings || typeof settings !== "object") return undefined;
  const env = (settings as { env?: unknown }).env;
  if (!env || typeof env !== "object") return undefined;
  const value = (env as Record<string, unknown>)[varName];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function ensureEnvFromPiSettings(varName: string, cwd?: string): string | undefined {
  const existing = process.env[varName];
  if (typeof existing === "string" && existing.trim()) return existing.trim();

  const root = cwd ?? process.cwd();
  const candidates = [
    path.join(root, ".pi", "settings.json"),
    path.join(getAgentDir(), "settings.json"),
  ];

  for (const filePath of candidates) {
    const settings = readJsonFileIfExists(filePath);
    const value = getEnvFromSettingsObject(settings, varName);
    if (value) {
      process.env[varName] = value;
      return value;
    }
  }

  return undefined;
}

function buildResultsText(source: string, query: string, results: SearchResult[]): string {
  const lines: string[] = [];
  lines.push(`Source: ${source}`);
  lines.push(`Query: ${query}`);
  lines.push("");

  if (results.length === 0) {
    lines.push("No results found.");
    return lines.join("\n");
  }

  results.forEach((result, index) => {
    lines.push(`${index + 1}. ${result.title}`);
    lines.push(`   ${result.url}`);
    if (result.snippet) {
      lines.push(`   ${result.snippet}`);
    }
    lines.push("");
  });

  return lines.join("\n").trim();
}

function truncateOutput(text: string): string {
  const truncation = truncateHead(text, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES,
  });

  if (!truncation.truncated) {
    return truncation.content;
  }

  return `${truncation.content}\n\n[Output truncated: ${truncation.outputLines}/${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)})]`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid response: ${text.slice(0, 200)}`);
  }
}

function buildErrorResult(message: string) {
  return {
    content: [{ type: "text", text: message }],
    details: { error: message },
    isError: true,
  };
}

function sanitizeSnippet(snippet?: string): string | undefined {
  if (!snippet) return undefined;
  return snippet.replace(/\s+/g, " ").trim();
}

async function exaSearch(params: {
  query: string;
  numResults?: number;
  searchType?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  useAutoprompt?: boolean;
  cwd?: string;
  signal?: AbortSignal;
}): Promise<{ results: SearchResult[]; raw: unknown }> {
  const apiKey = ensureEnvFromPiSettings(EXA_API_KEY_ENV, params.cwd);
  if (!apiKey) {
    throw new Error(
      `Set ${EXA_API_KEY_ENV} in your shell or in env.${EXA_API_KEY_ENV} inside pi settings.json.`,
    );
  }

  const numResults = Math.min(Math.max(params.numResults ?? 5, 1), 20);
  const body = {
    query: params.query,
    numResults,
    type: params.searchType ?? "neural",
    includeDomains: params.includeDomains,
    excludeDomains: params.excludeDomains,
    useAutoprompt: params.useAutoprompt ?? true,
  };

  const response = await fetch(EXA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
    signal: params.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Exa: ${response.status} ${response.statusText} - ${text.slice(0, 200)}`);
  }

  const json = await parseJsonResponse<{ results?: Array<Record<string, unknown>> }>(response);
  const results = (json.results ?? []).map((item) => ({
    title: String(item.title ?? item.id ?? "(untitled)"),
    url: String(item.url ?? ""),
    snippet: sanitizeSnippet(String(item.snippet ?? item.text ?? "")) || undefined,
  }));

  return { results, raw: json };
}

async function braveSearch(params: {
  query: string;
  count?: number;
  searchLang?: string;
  country?: string;
  safeSearch?: string;
  cwd?: string;
  signal?: AbortSignal;
}): Promise<{ results: SearchResult[]; raw: unknown }> {
  const apiKey = ensureEnvFromPiSettings(BRAVE_API_KEY_ENV, params.cwd);
  if (!apiKey) {
    throw new Error(
      `Set ${BRAVE_API_KEY_ENV} in your shell or in env.${BRAVE_API_KEY_ENV} inside pi settings.json.`,
    );
  }

  const url = new URL(BRAVE_API_URL);
  url.searchParams.set("q", params.query);
  url.searchParams.set("count", String(Math.min(Math.max(params.count ?? 5, 1), 20)));
  if (params.searchLang) url.searchParams.set("search_lang", params.searchLang);
  if (params.country) url.searchParams.set("country", params.country);
  if (params.safeSearch) url.searchParams.set("safesearch", params.safeSearch);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
    signal: params.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brave: ${response.status} ${response.statusText} - ${text.slice(0, 200)}`);
  }

  const json = await parseJsonResponse<{ web?: { results?: Array<Record<string, unknown>> } }>(response);
  const results = (json.web?.results ?? []).map((item) => ({
    title: String(item.title ?? "(untitled)"),
    url: String(item.url ?? ""),
    snippet: sanitizeSnippet(String(item.description ?? item.snippet ?? "")) || undefined,
  }));

  return { results, raw: json };
}

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
