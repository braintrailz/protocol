export type SchemaVersion = "0.2";

export type TrailId = string & { readonly __brand: "TrailId" };

export type CanonicalContext = {
  seed: string;
  facts: string[];
  objective: string;
  constraints: string[];
};

export type TrailEvent = {
  id: string;
  timestamp: string;
  summary: string;
  by?: string;
};

export type TrailDecision = {
  id: string;
  timestamp: string;
  summary: string;
  by?: string;
};

export type NextAction = {
  id: string;
  text: string;
  status: "open";
};

export type Trail = {
  schema_version: SchemaVersion;
  trail_id: TrailId;
  title: string;
  purpose: string;
  canonical_context: CanonicalContext;
  current_context: string;
  decisions: TrailDecision[];
  events: TrailEvent[];
  next_actions: NextAction[];
  updated_at: string;
};

export type ProtocolErrorCode =
  | "INVALID_TRAIL"
  | "INVALID_INPUT"
  | "TRAIL_EXISTS"
  | "TRAIL_NOT_FOUND";

export class ProtocolError extends Error {
  readonly code: ProtocolErrorCode;

  constructor(code: ProtocolErrorCode, message: string) {
    super(message);
    this.name = "ProtocolError";
    this.code = code;
  }
}

const TRAIL_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const TRAIL_KEYS = [
  "schema_version",
  "trail_id",
  "title",
  "purpose",
  "canonical_context",
  "current_context",
  "decisions",
  "events",
  "next_actions",
  "updated_at",
] as const;

const CANONICAL_KEYS = ["seed", "facts", "objective", "constraints"] as const;
const EVENT_KEYS = ["id", "timestamp", "summary", "by"] as const;
const ACTION_KEYS = ["id", "text", "status"] as const;

export function parseTrailId(input: string): TrailId {
  if (!TRAIL_ID_RE.test(input)) {
    throw new ProtocolError("INVALID_INPUT", `invalid trail_id: ${input}`);
  }
  return input as TrailId;
}

export function validateTrail(input: unknown): Trail {
  const record = asRecord(input, "trail");
  rejectUnknownKeys(record, TRAIL_KEYS, "trail");
  requireKeys(record, TRAIL_KEYS, "trail");

  if (record.schema_version !== "0.2") {
    throw new ProtocolError("INVALID_TRAIL", "schema_version must be 0.2");
  }

  const trail_id = requireString(record.trail_id, "trail_id");
  if (!TRAIL_ID_RE.test(trail_id)) {
    throw new ProtocolError("INVALID_TRAIL", `invalid trail_id: ${trail_id}`);
  }

  return {
    schema_version: "0.2",
    trail_id: trail_id as TrailId,
    title: requireNonEmpty(record.title, "title"),
    purpose: requireNonEmpty(record.purpose, "purpose"),
    canonical_context: parseCanonical(record.canonical_context),
    current_context: requireString(record.current_context, "current_context"),
    decisions: requireArray(record.decisions, "decisions").map((item, i) =>
      parseAttributed(`decisions[${i}]`, item),
    ),
    events: requireArray(record.events, "events").map((item, i) =>
      parseAttributed(`events[${i}]`, item),
    ),
    next_actions: requireArray(record.next_actions, "next_actions").map((item, i) =>
      parseAction(`next_actions[${i}]`, item),
    ),
    updated_at: requireTimestamp(record.updated_at, "updated_at"),
  };
}

function parseCanonical(input: unknown): CanonicalContext {
  const record = asRecord(input, "canonical_context");
  rejectUnknownKeys(record, CANONICAL_KEYS, "canonical_context");
  requireKeys(record, CANONICAL_KEYS, "canonical_context");
  return {
    seed: requireNonEmpty(record.seed, "canonical_context.seed"),
    facts: requireStringArray(record.facts, "canonical_context.facts"),
    objective: requireNonEmpty(record.objective, "canonical_context.objective"),
    constraints: requireStringArray(
      record.constraints,
      "canonical_context.constraints",
    ),
  };
}

function parseAttributed(label: string, input: unknown): TrailEvent {
  const record = asRecord(input, label);
  rejectUnknownKeys(record, EVENT_KEYS, label);
  requireKeys(record, ["id", "timestamp", "summary"], label);
  const item: TrailEvent = {
    id: requireNonEmpty(record.id, `${label}.id`),
    timestamp: requireTimestamp(record.timestamp, `${label}.timestamp`),
    summary: requireNonEmpty(record.summary, `${label}.summary`),
  };
  if ("by" in record) {
    item.by = requireNonEmpty(record.by, `${label}.by`);
  }
  return item;
}

function parseAction(label: string, input: unknown): NextAction {
  const record = asRecord(input, label);
  rejectUnknownKeys(record, ACTION_KEYS, label);
  requireKeys(record, ACTION_KEYS, label);
  if (record.status !== "open") {
    throw new ProtocolError("INVALID_TRAIL", `${label}.status must be "open"`);
  }
  return {
    id: requireNonEmpty(record.id, `${label}.id`),
    text: requireNonEmpty(record.text, `${label}.text`),
    status: "open",
  };
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProtocolError("INVALID_TRAIL", `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  for (const key of keys) {
    if (!(key in record)) {
      throw new ProtocolError("INVALID_TRAIL", `${label} missing field: ${key}`);
    }
  }
}

function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const allowedSet = new Set<string>(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedSet.has(key)) {
      throw new ProtocolError("INVALID_TRAIL", `${label} has unknown field: ${key}`);
    }
  }
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new ProtocolError("INVALID_TRAIL", `${label} must be a string`);
  }
  return value;
}

function requireNonEmpty(value: unknown, label: string): string {
  const text = requireString(value, label);
  if (text.length === 0) {
    throw new ProtocolError("INVALID_TRAIL", `${label} must be non-empty`);
  }
  return text;
}

function requireTimestamp(value: unknown, label: string): string {
  const text = requireString(value, label);
  if (!ISO_UTC_RE.test(text) || Number.isNaN(Date.parse(text))) {
    throw new ProtocolError("INVALID_TRAIL", `${label} must be an ISO-8601 UTC timestamp`);
  }
  return text;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ProtocolError("INVALID_TRAIL", `${label} must be an array`);
  }
  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  return requireArray(value, label).map((item, i) =>
    requireString(item, `${label}[${i}]`),
  );
}
