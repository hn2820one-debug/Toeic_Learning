type LogLevel = "info" | "warn" | "error";

type OpsLogPayload = {
  area: string;
  event: string;
  detail?: Record<string, unknown>;
  error?: unknown;
};

function normalizeError(error: unknown) {
  if (!error) {
    return undefined;
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: String(error) };
}

function print(level: LogLevel, payload: OpsLogPayload) {
  const body = {
    ts: new Date().toISOString(),
    area: payload.area,
    event: payload.event,
    ...(payload.detail ? { detail: payload.detail } : {}),
    ...(payload.error ? { error: normalizeError(payload.error) } : {}),
  };
  if (level === "error") {
    console.error("[ops]", JSON.stringify(body));
    return;
  }
  if (level === "warn") {
    console.warn("[ops]", JSON.stringify(body));
    return;
  }
  console.info("[ops]", JSON.stringify(body));
}

export function logOpsInfo(payload: OpsLogPayload) {
  print("info", payload);
}

export function logOpsWarn(payload: OpsLogPayload) {
  print("warn", payload);
}

export function logOpsError(payload: OpsLogPayload) {
  print("error", payload);
}

