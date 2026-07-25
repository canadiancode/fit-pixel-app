/**
 * Keys that must never appear in pending_server_ops.payload_json.
 * Strip recursively before INSERT (defense in depth — callers should not pass these).
 *
 * Catches renamed secret keys (e.g. fatSecretClientSecret) while allowing benign
 * HealthKit metadata such as permission flags / last-read timestamps.
 */
const FORBIDDEN_EXACT_KEY =
  /^(password|passwd|secret|token|access[_-]?token|refresh[_-]?token|id[_-]?token|auth(orization)?|api[_-]?key|client[_-]?secret|bearer|session|cookie|private[_-]?key|health[_-]?kit|hk[_-]?raw|raw[_-]?samples?|hk[_-]?samples?)$/i;

/** Credential-ish substrings (e.g. fatSecretClientSecret, oauthAccessToken). */
const FORBIDDEN_SECRET_SUBSTRING =
  /(password|passwd|client[_-]?secret|private[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|(^|[_-])secret($|[_-])|(^|[_-])token($|[_-])|authorization|bearer)/i;

/** HealthKit *raw sample* blobs only — not authorized flags / lastSuccessfulReadAt. */
const FORBIDDEN_HEALTH_RAW_SUBSTRING =
  /(hk[_-]?raw|raw[_-]?samples?|hk[_-]?samples?|health[_-]?kit[_-]?(raw|samples?|blob))/i;

function isForbiddenPayloadKey(key: string): boolean {
  return (
    FORBIDDEN_EXACT_KEY.test(key) ||
    FORBIDDEN_SECRET_SUBSTRING.test(key) ||
    FORBIDDEN_HEALTH_RAW_SUBSTRING.test(key)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return [];
    seen.add(value);
    return value.map((item) => sanitizeValue(item, seen));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  if (seen.has(value)) {
    return {};
  }
  seen.add(value);

  const out: Record<string, unknown> = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    if (isForbiddenPayloadKey(key)) {
      continue;
    }
    out[key] = sanitizeValue(child, seen);
  }
  return out;
}

/**
 * Drop tokens / passwords / HealthKit raw blobs from a payload before enqueue.
 * Returns a plain object safe to stringify into payload_json.
 */
export function sanitizePendingOpPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized = sanitizeValue(payload, new WeakSet());
  if (!isPlainObject(sanitized)) {
    return {};
  }
  return sanitized;
}
