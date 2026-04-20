import "server-only";

/**
 * Lightweight guard against duplicate submits from rapid clicks / retries.
 * Caller passes a client-generated key per answer submission.
 */
export function isDuplicateSubmitKey(lastSubmitKey: string | undefined, incomingKey: string | undefined) {
  if (!incomingKey) {
    return false;
  }
  return lastSubmitKey != null && lastSubmitKey === incomingKey;
}

export function normalizeSubmitKey(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }
  const v = raw.trim();
  return v.length > 0 ? v.slice(0, 80) : undefined;
}

