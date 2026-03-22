import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BRAVE_API_KEY_ENV,
  EXA_API_KEY_ENV,
  braveSearch,
  buildResultsText,
  ensureEnvFromPiSettings,
  exaSearch,
  truncateOutput,
} from "../search-core.ts";

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-extension-search-"));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function restoreEnv(name: string, previous: string | undefined) {
  if (previous === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = previous;
}

test("ensureEnvFromPiSettings loads project-local Pi settings", async () => {
  await withTempDir(async (dir) => {
    const previous = process.env[EXA_API_KEY_ENV];
    delete process.env[EXA_API_KEY_ENV];

    await fs.mkdir(path.join(dir, ".pi"), { recursive: true });
    await fs.writeFile(
      path.join(dir, ".pi", "settings.json"),
      JSON.stringify({ env: { EXA_API_KEY: "project-exa-key" } }, null, 2),
      "utf8",
    );

    try {
      const value = ensureEnvFromPiSettings(EXA_API_KEY_ENV, dir);
      assert.equal(value, "project-exa-key");
      assert.equal(process.env[EXA_API_KEY_ENV], "project-exa-key");
    } finally {
      restoreEnv(EXA_API_KEY_ENV, previous);
    }
  });
});

test("ensureEnvFromPiSettings falls back to global Pi settings", async () => {
  await withTempDir(async (dir) => {
    const previousKey = process.env[BRAVE_API_KEY_ENV];
    const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
    delete process.env[BRAVE_API_KEY_ENV];

    const agentDir = path.join(dir, "agent-home");
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(
      path.join(agentDir, "settings.json"),
      JSON.stringify({ env: { BRAVE_API_KEY: "global-brave-key" } }, null, 2),
      "utf8",
    );
    process.env.PI_CODING_AGENT_DIR = agentDir;

    try {
      const value = ensureEnvFromPiSettings(BRAVE_API_KEY_ENV, dir);
      assert.equal(value, "global-brave-key");
      assert.equal(process.env[BRAVE_API_KEY_ENV], "global-brave-key");
    } finally {
      restoreEnv(BRAVE_API_KEY_ENV, previousKey);
      restoreEnv("PI_CODING_AGENT_DIR", previousAgentDir);
    }
  });
});

test("ensureEnvFromPiSettings does not overwrite an existing environment variable", () => {
  const previous = process.env[EXA_API_KEY_ENV];
  process.env[EXA_API_KEY_ENV] = "already-set";

  try {
    const value = ensureEnvFromPiSettings(EXA_API_KEY_ENV, process.cwd());
    assert.equal(value, "already-set");
    assert.equal(process.env[EXA_API_KEY_ENV], "already-set");
  } finally {
    restoreEnv(EXA_API_KEY_ENV, previous);
  }
});

test("buildResultsText and truncateOutput return readable output", () => {
  const text = buildResultsText("exa", "pi coding agent", [
    {
      title: "Pi docs",
      url: "https://pi.dev",
      snippet: "Docs and examples",
    },
  ]);

  assert.match(text, /Source: exa/);
  assert.match(text, /Query: pi coding agent/);
  assert.match(text, /Pi docs/);

  const longText = Array.from({ length: 3000 }, (_, index) => `line ${index}`).join("\n");
  const truncated = truncateOutput(longText);
  assert.match(truncated, /Output truncated:/);
});

test("exaSearch sends the expected request and parses results", async () => {
  const previousKey = process.env[EXA_API_KEY_ENV];
  const previousFetch = globalThis.fetch;
  process.env[EXA_API_KEY_ENV] = "exa-test-key";

  try {
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      assert.equal(String(input), "https://api.exa.ai/search");
      assert.equal(init?.method, "POST");
      assert.equal((init?.headers as Record<string, string>)["X-API-Key"], "exa-test-key");

      const body = JSON.parse(String(init?.body));
      assert.equal(body.query, "pi package");
      assert.equal(body.numResults, 3);
      assert.equal(body.type, "keyword");

      return new Response(
        JSON.stringify({
          results: [
            {
              title: "Exa Result",
              url: "https://example.com/exa",
              snippet: "  useful   snippet  ",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const result = await exaSearch({
      query: "pi package",
      numResults: 3,
      searchType: "keyword",
    });

    assert.equal(result.results.length, 1);
    assert.equal(result.results[0]?.title, "Exa Result");
    assert.equal(result.results[0]?.snippet, "useful snippet");
  } finally {
    restoreEnv(EXA_API_KEY_ENV, previousKey);
    globalThis.fetch = previousFetch;
  }
});

test("braveSearch sends the expected request and parses results", async () => {
  const previousKey = process.env[BRAVE_API_KEY_ENV];
  const previousFetch = globalThis.fetch;
  process.env[BRAVE_API_KEY_ENV] = "brave-test-key";

  try {
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = new URL(String(input));
      assert.equal(url.origin + url.pathname, "https://api.search.brave.com/res/v1/web/search");
      assert.equal(url.searchParams.get("q"), "pi package");
      assert.equal(url.searchParams.get("count"), "4");
      assert.equal(url.searchParams.get("country"), "BR");
      assert.equal((init?.headers as Record<string, string>)["X-Subscription-Token"], "brave-test-key");

      return new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: "Brave Result",
                url: "https://example.com/brave",
                description: "  brave   snippet  ",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const result = await braveSearch({
      query: "pi package",
      count: 4,
      country: "BR",
    });

    assert.equal(result.results.length, 1);
    assert.equal(result.results[0]?.title, "Brave Result");
    assert.equal(result.results[0]?.snippet, "brave snippet");
  } finally {
    restoreEnv(BRAVE_API_KEY_ENV, previousKey);
    globalThis.fetch = previousFetch;
  }
});
