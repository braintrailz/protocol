import {
  parseTrailId,
  ProtocolError,
  type CanonicalContext,
  type NextAction,
  type Trail,
  type TrailDecision,
  type TrailEvent,
  validateTrail,
} from "./schema.ts";
import type { TrailStore } from "./store.ts";

export type Clock = () => string;

export type CreateTrailInput = {
  trail_id: string;
  title: string;
  purpose: string;
  canonical_context: CanonicalContext;
  next_actions?: readonly { text: string }[];
};

export type ProtocolOperations = {
  create(input: CreateTrailInput): Promise<Trail>;
  get(input: { trail_id: string }): Promise<Trail>;
  setCurrentContext(input: {
    trail_id: string;
    current_context: string;
  }): Promise<Trail>;
  appendEvent(input: {
    trail_id: string;
    summary: string;
    by?: string;
  }): Promise<Trail>;
  recordDecision(input: {
    trail_id: string;
    summary: string;
    by?: string;
  }): Promise<Trail>;
  getNextActions(input: { trail_id: string }): Promise<{
    next_actions: NextAction[];
    updated_at: string;
  }>;
  setNextActions(input: {
    trail_id: string;
    actions: readonly { text: string }[];
  }): Promise<Trail>;
};

export function createOperations(options: {
  store: TrailStore;
  now?: Clock;
}): ProtocolOperations {
  const { store } = options;
  const now = options.now ?? defaultNow;

  return {
    async create(input) {
      const next_actions = (input.next_actions ?? []).map((action, i) => ({
        id: paddedId("a", i + 1),
        text: requireInputString(action.text, "text"),
        status: "open" as const,
      }));
      const trail = validateTrail({
        schema_version: "0.2",
        trail_id: parseTrailId(input.trail_id),
        title: input.title,
        purpose: input.purpose,
        canonical_context: input.canonical_context,
        current_context: "",
        decisions: [],
        events: [],
        next_actions,
        updated_at: now(),
      });
      await store.create(trail);
      return trail;
    },

    async get(input) {
      return store.get(parseTrailId(input.trail_id));
    },

    async setCurrentContext(input) {
      if (typeof input.current_context !== "string") {
        throw new ProtocolError("INVALID_INPUT", "current_context must be a string");
      }
      return mutate(store, input.trail_id, now, (trail) => ({
        ...trail,
        current_context: input.current_context,
      }));
    },

    async appendEvent(input) {
      return mutate(store, input.trail_id, now, (trail) => ({
        ...trail,
        events: [
          ...trail.events,
          attributed("e", trail.events, input.summary, input.by, now()),
        ],
      }));
    },

    async recordDecision(input) {
      return mutate(store, input.trail_id, now, (trail) => ({
        ...trail,
        decisions: [
          ...trail.decisions,
          attributed("d", trail.decisions, input.summary, input.by, now()),
        ],
      }));
    },

    async getNextActions(input) {
      const trail = await store.get(parseTrailId(input.trail_id));
      return {
        next_actions: trail.next_actions.filter((action) => action.status === "open"),
        updated_at: trail.updated_at,
      };
    },

    async setNextActions(input) {
      return mutate(store, input.trail_id, now, (trail) => ({
        ...trail,
        next_actions: input.actions.map((action, i) => ({
          id: paddedId("a", i + 1),
          text: requireInputString(action.text, "text"),
          status: "open" as const,
        })),
      }));
    },
  };
}

function defaultNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function mutate(
  store: TrailStore,
  trailId: string,
  now: Clock,
  mutation: (trail: Trail) => Trail,
): Promise<Trail> {
  return store.mutate(parseTrailId(trailId), (trail) => ({
    ...mutation(trail),
    updated_at: now(),
  }));
}

function attributed(
  prefix: "e" | "d",
  existing: readonly { id: string }[],
  summary: string,
  by: string | undefined,
  timestamp: string,
): TrailEvent | TrailDecision {
  const item: TrailEvent = {
    id: nextPrefixedId(prefix, existing),
    timestamp,
    summary: requireInputString(summary, "summary"),
  };
  if (by !== undefined) {
    item.by = requireInputString(by, "by");
  }
  return item;
}

function nextPrefixedId(prefix: string, existing: readonly { id: string }[]): string {
  let max = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  for (const item of existing) {
    const match = pattern.exec(item.id);
    const n = match?.[1] === undefined ? 0 : Number(match[1]);
    if (n > max) {
      max = n;
    }
  }
  return paddedId(prefix, max + 1);
}

function paddedId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

function requireInputString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ProtocolError("INVALID_INPUT", `${label} must be a non-empty string`);
  }
  return value;
}
