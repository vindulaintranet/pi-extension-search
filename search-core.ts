import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * pi-extension-search core helpers
 * Created by Fabio Rizzo Matos
 * GitHub: https://github.com/fabiorizzomatos
 * Contact: fabiorizzo@vindula.com.br
 */

export type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

export const EXA_API_URL = "https://api.exa.ai/search";
export const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
export const EXA_API_KEY_ENV = "EXA_API_KEY";
export const BRAVE_API_KEY_ENV = "BRAVE_API_KEY";
export const OUTPUT_MAX_LINES = 2000;
export const OUTPUT_MAX_BYTES = 50 * 1024;

export function getPiAgentDir(): string {
  return process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".pi", "agent");
}

export function readJsonFileIfExists(filePath: string): unknown | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function getEnvFromSettingsObject(settings: unknown, varName: string): string | undefined {
  if (!settings || typeof settings !== "object") return undefined;
  const env = (settings as { env?: unknown }).env;
  if (!env || typeof env !== "object") return undefined;
  const value = (env as Record<string, unknown>)[varName];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function ensureEnvFromPiSettings(varName: string, cwd?: string): string | undefined {
  const existing = process.env[varName];
  if (typeof existing === "string" && existing.trim()) return existing.trim();

  const root = cwd ?? process.cwd();
  const candidates = [
    path.join(root, ".pi", "settings.json"),
    path.join(getPiAgentDir(), "settings.json"),
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

export function buildResultsText(source: string, query: string, results: SearchResult[]): string {
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

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function truncateOutput(text: string): string {
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  let bytes = 0;

  for (const line of lines) {
    const lineBytes = Buffer.byteLength(`${line}\n`);
    if (kept.length >= OUTPUT_MAX_LINES || bytes + lineBytes > OUTPUT_MAX_BYTES) {
      break;
    }
    kept.push(line);
    bytes += lineBytes;
  }

  const totalBytes = Buffer.byteLength(text);
  const truncated = kept.length < lines.length || bytes < totalBytes;
  const content = kept.join("\n");

  if (!truncated) {
    return content;
  }

  return `${content}\n\n[Output truncated: ${kept.length}/${lines.length} lines (${formatSize(bytes)} of ${formatSize(totalBytes)})]`;
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid response: ${text.slice(0, 200)}`);
  }
}

export function buildErrorResult(message: string) {
  return {
    content: [{ type: "text", text: message }],
    details: { error: message },
    isError: true,
  };
}

export function sanitizeSnippet(snippet?: string): string | undefined {
  if (!snippet) return undefined;
  return snippet.replace(/\s+/g, " ").trim();
}

export async function exaSearch(params: {
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

export async function braveSearch(params: {
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
