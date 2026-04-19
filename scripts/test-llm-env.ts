import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { spawnSync } from "node:child_process";

type EnvCheckResult = {
  name: "GEMINI_API_KEY" | "ANTHROPIC_API_KEY" | "OPENAI_API_KEY";
  ok: boolean;
  errorMessage?: string;
};

const childScript = `
  (async () => {
    const providersModule = await import("./src/lib/llm/providers.ts");
    const providers = providersModule.default ?? providersModule;
    const checks = [
      ["GEMINI_API_KEY", providers.getGoogleApiKey],
      ["ANTHROPIC_API_KEY", providers.getAnthropicApiKey],
      ["OPENAI_API_KEY", providers.getOpenAiApiKey],
    ];

    const results = checks.map(([name, reader]) => {
      try {
        reader();
        return { name, ok: true };
      } catch (error) {
        return {
          name,
          ok: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        };
      }
    });

    console.log(JSON.stringify(results));
  })().catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "-e", childScript], {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8",
});

if (result.status !== 0) {
  if (result.stderr.trim().length > 0) {
    console.error(result.stderr.trim());
  }
  process.exit(result.status ?? 1);
}

const rawOutput = result.stdout.trim();
const checks = JSON.parse(rawOutput) as EnvCheckResult[];
const missing = checks.filter((check) => !check.ok);

if (missing.length > 0) {
  for (const check of missing) {
    console.error(`Missing ${check.name}: ${check.errorMessage ?? "unknown error"}`);
  }
  process.exit(1);
}

console.log("All LLM provider env readers returned values.");
