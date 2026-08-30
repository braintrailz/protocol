import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it } from "bun:test";

import { createOperations } from "../src/operations.ts";
import { createMcpServer } from "../src/server.ts";
import { FilesystemTrailStore } from "../src/store.ts";

const FIXED_NOW = "2026-08-30T18:00:00Z";

const canonical = {
  seed: "Original message.",
  facts: ["Fact one.", "Fact two."],
  objective: "Objective.",
  constraints: ["A constraint."],
};

const TOOLS = [
  "trail_create",
  "trail_get",
  "trail_set_current_context",
  "trail_append_event",
  "trail_record_decision",
  "trail_get_next_actions",
  "trail_set_next_actions",
] as const;

async function withClient(
  run: (call: (name: string, args: Record<string, unknown>) => Promise<unknown>) => Promise<void>,
) {
  const dir = await mkdtemp(join(tmpdir(), "braintrailz-mcp-"));
  const store = new FilesystemTrailStore({ trailsDir: dir });
  const ops = createOperations({ store, now: () => FIXED_NOW });
  const server = createMcpServer(ops);
  const client = new Client({ name: "braintrailz-test", version: "0.2.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    await run(async (name, args) => {
      const result = await client.callTool({ name, arguments: args });
      const block = result.content[0];
      if (block === undefined || block.type !== "text") {
        throw new Error("expected text content");
      }
      const body: unknown = JSON.parse(block.text);
      if (result.isError) {
        throw body;
      }
      return body;
    });
  } finally {
    await client.close();
    await server.close();
    await rm(dir, { recursive: true, force: true });
  }
}

describe("MCP transport", () => {
  it("exposes the seven protocol operations and no generic save", async () => {
    const dir = await mkdtemp(join(tmpdir(), "braintrailz-mcp-"));
    try {
      const store = new FilesystemTrailStore({ trailsDir: dir });
      const ops = createOperations({ store, now: () => FIXED_NOW });
      const server = createMcpServer(ops);
      const client = new Client({ name: "braintrailz-test", version: "0.2.0" });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      try {
        const listed = await client.listTools();
        const names = listed.tools.map((tool) => tool.name).sort();
        expect(names).toEqual([...TOOLS].sort());
        expect(names).not.toContain("trail_save");
      } finally {
        await client.close();
        await server.close();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("trail_create then trail_get", async () => {
    await withClient(async (call) => {
      const created = await call("trail_create", {
        trail_id: "telephone-001",
        title: "Telephone Test 001",
        purpose: "Prove that canonical context survives AI handoffs.",
        canonical_context: canonical,
        next_actions: [{ text: "Pass the trail to the next participant." }],
      });
      expect(created).toMatchObject({
        trail_id: "telephone-001",
        current_context: "",
        events: [],
        decisions: [],
      });
      const got = await call("trail_get", { trail_id: "telephone-001" });
      expect(got).toEqual(created);
    });
  });

  it("trail_set_current_context does not alter canonical_context", async () => {
    await withClient(async (call) => {
      await call("trail_create", {
        trail_id: "telephone-001",
        title: "Telephone Test 001",
        purpose: "Prove that canonical context survives AI handoffs.",
        canonical_context: canonical,
      });
      const updated = await call("trail_set_current_context", {
        trail_id: "telephone-001",
        current_context: "Client A has retrieved the trail.",
      });
      expect(updated).toMatchObject({
        current_context: "Client A has retrieved the trail.",
        canonical_context: canonical,
      });
    });
  });

  it("trail_append_event", async () => {
    await withClient(async (call) => {
      await call("trail_create", {
        trail_id: "telephone-001",
        title: "Telephone Test 001",
        purpose: "Prove that canonical context survives AI handoffs.",
        canonical_context: canonical,
      });
      const updated = await call("trail_append_event", {
        trail_id: "telephone-001",
        summary: "Client A observed the seed is intact.",
        by: "client-a",
      });
      expect(updated).toMatchObject({
        events: [
          {
            id: "e-001",
            timestamp: FIXED_NOW,
            summary: "Client A observed the seed is intact.",
            by: "client-a",
          },
        ],
        canonical_context: canonical,
      });
    });
  });

  it("trail_record_decision", async () => {
    await withClient(async (call) => {
      await call("trail_create", {
        trail_id: "telephone-001",
        title: "Telephone Test 001",
        purpose: "Prove that canonical context survives AI handoffs.",
        canonical_context: canonical,
      });
      const updated = await call("trail_record_decision", {
        trail_id: "telephone-001",
        summary: "Keep the seed unchanged across handoffs.",
        by: "client-a",
      });
      expect(updated).toMatchObject({
        decisions: [
          {
            id: "d-001",
            timestamp: FIXED_NOW,
            summary: "Keep the seed unchanged across handoffs.",
            by: "client-a",
          },
        ],
        canonical_context: canonical,
      });
    });
  });

  it("trail_get_next_actions and trail_set_next_actions", async () => {
    await withClient(async (call) => {
      await call("trail_create", {
        trail_id: "telephone-001",
        title: "Telephone Test 001",
        purpose: "Prove that canonical context survives AI handoffs.",
        canonical_context: canonical,
        next_actions: [{ text: "Pass the trail to the next participant." }],
      });
      const before = await call("trail_get_next_actions", {
        trail_id: "telephone-001",
      });
      expect(before).toEqual({
        updated_at: FIXED_NOW,
        next_actions: [
          {
            id: "a-001",
            text: "Pass the trail to the next participant.",
            status: "open",
          },
        ],
      });
      await call("trail_set_next_actions", {
        trail_id: "telephone-001",
        actions: [{ text: "Hand off to Client B." }],
      });
      const after = await call("trail_get_next_actions", {
        trail_id: "telephone-001",
      });
      expect(after).toEqual({
        updated_at: FIXED_NOW,
        next_actions: [
          {
            id: "a-001",
            text: "Hand off to Client B.",
            status: "open",
          },
        ],
      });
    });
  });

  it("returns a protocol error for a duplicate trail_create", async () => {
    await withClient(async (call) => {
      const input = {
        trail_id: "telephone-001",
        title: "Telephone Test 001",
        purpose: "Prove that canonical context survives AI handoffs.",
        canonical_context: canonical,
      };
      await call("trail_create", input);
      try {
        await call("trail_create", input);
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toMatchObject({ code: "TRAIL_EXISTS" });
      }
    });
  });
});
