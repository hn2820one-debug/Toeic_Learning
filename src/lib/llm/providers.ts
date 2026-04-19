import "server-only";

function readRequiredEnv(name: "GEMINI_API_KEY" | "ANTHROPIC_API_KEY" | "OPENAI_API_KEY") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}. Set it in server env only and do not use a NEXT_PUBLIC_ prefix.`);
  }

  return value;
}

export function getGoogleApiKey() {
  return readRequiredEnv("GEMINI_API_KEY");
}

export function getAnthropicApiKey() {
  return readRequiredEnv("ANTHROPIC_API_KEY");
}

export function getOpenAiApiKey() {
  return readRequiredEnv("OPENAI_API_KEY");
}
