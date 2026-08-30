import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

import { createOperations } from "../src/operations.ts";
import { parseTrailId, ProtocolError, validateTrail } from "../src/schema.ts";
import { FilesystemTrailStore } from "../src/store.ts";

const fixturePath = `${import.meta.dir}/../trails/telephone-001.json`;

const FIXED_NOW = "2026-08-30T18:00:00Z";

const canonical = {
  seed: "Original message.",
  facts: ["Fact one.", "Fact two."],
  objective: "Objective.",
  constraints: ["A constraint."],
};

function validTrail(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: "0.2",
    trail_id: "telephone-001",
    title: "Telephone Test 001",
    purpose: "Prove that canonical context survives AI handoffs.",
    canonical_context: canonical,
    current_context: "",
    decisions: [],
    events: [],
    next_actions: [
      {
        id: "a-001",
        text: "Pass the trail to the next participant.",
        status: "open",
      },
    ],
    updated_at: FIXED_NOW,
    ...overrides,
  };
}

async function withOps(run: (ops: ReturnType<typeof createOperations>) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "braintrailz-"));
  try {
    const store = new FilesystemTrailStore({ trailsDir: dir });
    const ops = createOperations({ store, now: () => FIXED_NOW });
    await run(ops);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function expectProtocolError(err: unknown, code: ProtocolError["code"]) {
  expect(err).toBeInstanceOf(ProtocolError);
  if (err instanceof ProtocolError) {
    expect(err.code).toBe(code);
  }
}

describe("schema", () => {
  it("accepts the telephone-001 fixture", async () => {
    const raw: unknown = await Bun.file(fixturePath).json();
    const trail = validateTrail(raw);
    expect(trail.trail_id).toBe(parseTrailId("telephone-001"));
    expect(trail.schema_version).toBe("0.2");
    expect(trail.canonical_context).toEqual(canonical);
  });

  it("rejects unknown top-level fields", () => {
    try {
      validateTrail(validTrail({ vendor_memory: "nope" }));
      throw new Error("expected throw");
    } catch (err) {
      expectProtocolError(err, "INVALID_TRAIL");
    }
  });

  it("rejects an invalid trail_id", () => {
    try {
      validateTrail(validTrail({ trail_id: "Telephone_001" }));
      throw new Error("expected throw");
    } catch (err) {
      expectProtocolError(err, "INVALID_TRAIL");
    }
  });
});

describe("protocol operations", () => {
  describe("trail_create", () => {
    it("creates a validated trail", async () => {
      await withOps(async (ops) => {
        const trail = await ops.create({
          trail_id: "telephone-001",
          title: "Telephone Test 001",
          purpose: "Prove that canonical context survives AI handoffs.",
          canonical_context: canonical,
          next_actions: [{ text: "Pass the trail to the next participant." }],
        });
        expect(trail.trail_id).toBe(parseTrailId("telephone-001"));
        expect(trail.current_context).toBe("");
        expect(trail.events).toEqual([]);
        expect(trail.decisions).toEqual([]);
        expect(trail.next_actions[0]?.id).toBe("a-001");
        expect(trail.updated_at).toBe(FIXED_NOW);
      });
    });

    it("fails if the trail_id already exists", async () => {
      await withOps(async (ops) => {
        const input = {
          trail_id: "telephone-001",
          title: "Telephone Test 001",
          purpose: "Prove that canonical context survives AI handoffs.",
          canonical_context: canonical,
        };
        await ops.create(input);
        try {
          await ops.create(input);
          throw new Error("expected throw");
        } catch (err) {
          expectProtocolError(err, "TRAIL_EXISTS");
        }
      });
    });
  });

  describe("trail_get", () => {
    it("returns the complete validated trail", async () => {
      await withOps(async (ops) => {
        await ops.create({
          trail_id: "telephone-001",
          title: "Telephone Test 001",
          purpose: "Prove that canonical context survives AI handoffs.",
          canonical_context: canonical,
        });
        const trail = await ops.get({ trail_id: "telephone-001" });
        expect(trail.title).toBe("Telephone Test 001");
        expect(trail.canonical_context).toEqual(canonical);
      });
    });
  });

  describe("trail_set_current_context", () => {
    it("replaces current_context and does not alter canonical_context", async () => {
      await withOps(async (ops) => {
        await ops.create({
          trail_id: "telephone-001",
          title: "Telephone Test 001",
          purpose: "Prove that canonical context survives AI handoffs.",
          canonical_context: canonical,
        });
        const updated = await ops.setCurrentContext({
          trail_id: "telephone-001",
          current_context: "Client A has retrieved the trail.",
        });
        expect(updated.current_context).toBe("Client A has retrieved the trail.");
        expect(updated.canonical_context).toEqual(canonical);
        const reread = await ops.get({ trail_id: "telephone-001" });
        expect(reread.canonical_context).toEqual(canonical);
      });
    });
  });

  describe("trail_append_event", () => {
    it("appends an event with a generated id and timestamp", async () => {
      await withOps(async (ops) => {
        await ops.create({
          trail_id: "telephone-001",
          title: "Telephone Test 001",
          purpose: "Prove that canonical context survives AI handoffs.",
          canonical_context: canonical,
        });
        const updated = await ops.appendEvent({
          trail_id: "telephone-001",
          summary: "Client A observed the seed is intact.",
          by: "client-a",
        });
        expect(updated.events).toHaveLength(1);
        expect(updated.events[0]).toEqual({
          id: "e-001",
          timestamp: FIXED_NOW,
          summary: "Client A observed the seed is intact.",
          by: "client-a",
        });
        expect(updated.canonical_context).toEqual(canonical);
      });
    });

    it("is append-only", async () => {
      await withOps(async (ops) => {
        await ops.create({
          trail_id: "telephone-001",
          title: "Telephone Test 001",
          purpose: "Prove that canonical context survives AI handoffs.",
          canonical_context: canonical,
        });
        await ops.appendEvent({
          trail_id: "telephone-001",
          summary: "first",
        });
        const updated = await ops.appendEvent({
          trail_id: "telephone-001",
          summary: "second",
        });
        expect(updated.events.map((event) => event.summary)).toEqual([
          "first",
          "second",
        ]);
        expect(updated.events[1]?.id).toBe("e-002");
      });
    });
  });

  describe("trail_record_decision", () => {
    it("appends a decision without rewriting canonical context", async () => {
      await withOps(async (ops) => {
        await ops.create({
          trail_id: "telephone-001",
          title: "Telephone Test 001",
          purpose: "Prove that canonical context survives AI handoffs.",
          canonical_context: canonical,
        });
        const updated = await ops.recordDecision({
          trail_id: "telephone-001",
          summary: "Keep the seed unchanged across handoffs.",
          by: "client-a",
        });
        expect(updated.decisions[0]).toEqual({
          id: "d-001",
          timestamp: FIXED_NOW,
          summary: "Keep the seed unchanged across handoffs.",
          by: "client-a",
        });
        expect(updated.canonical_context).toEqual(canonical);
      });
    });
  });

  describe("trail_get_next_actions", () => {
    it("returns open next actions and updated_at", async () => {
      await withOps(async (ops) => {
        await ops.create({
          trail_id: "telephone-001",
          title: "Telephone Test 001",
          purpose: "Prove that canonical context survives AI handoffs.",
          canonical_context: canonical,
          next_actions: [{ text: "Pass the trail to the next participant." }],
        });
        const result = await ops.getNextActions({ trail_id: "telephone-001" });
        expect(result.updated_at).toBe(FIXED_NOW);
        expect(result.next_actions).toEqual([
          {
            id: "a-001",
            text: "Pass the trail to the next participant.",
            status: "open",
          },
        ]);
      });
    });
  });

  describe("trail_set_next_actions", () => {
    it("replaces the next-action set and generates ids", async () => {
      await withOps(async (ops) => {
        await ops.create({
          trail_id: "telephone-001",
          title: "Telephone Test 001",
          purpose: "Prove that canonical context survives AI handoffs.",
          canonical_context: canonical,
          next_actions: [{ text: "Pass the trail to the next participant." }],
        });
        const updated = await ops.setNextActions({
          trail_id: "telephone-001",
          actions: [{ text: "Hand off to Client B." }],
        });
        expect(updated.next_actions).toEqual([
          {
            id: "a-001",
            text: "Hand off to Client B.",
            status: "open",
          },
        ]);
        expect(updated.canonical_context).toEqual(canonical);
      });
    });
  });
});
