import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

import { createOperations, type ProtocolOperations } from "./operations.ts";
import { ProtocolError } from "./schema.ts";
import { FilesystemTrailStore } from "./store.ts";

const canonicalContextSchema = z.object({
  seed: z.string(),
  facts: z.array(z.string()),
  objective: z.string(),
  constraints: z.array(z.string()),
});

const actionTextSchema = z.object({
  text: z.string(),
});

export function createProtocol(options: { trailsDir: string; now?: () => string }): ProtocolOperations {
  return createOperations({
    store: new FilesystemTrailStore({ trailsDir: options.trailsDir }),
    ...(options.now === undefined ? {} : { now: options.now }),
  });
}

export function createMcpServer(ops: ProtocolOperations): McpServer {
  const server = new McpServer(
    { name: "braintrailz-protocol", version: "0.2.0" },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    "trail_create",
    {
      description: "Create a new validated trail. Fails if the trail_id already exists.",
      inputSchema: z.object({
        trail_id: z.string(),
        title: z.string(),
        purpose: z.string(),
        canonical_context: canonicalContextSchema,
        next_actions: z.array(actionTextSchema).optional(),
      }),
    },
    async (input) =>
      runTool(() =>
        ops.create({
          trail_id: input.trail_id,
          title: input.title,
          purpose: input.purpose,
          canonical_context: input.canonical_context,
          ...(input.next_actions === undefined ? {} : { next_actions: input.next_actions }),
        }),
      ),
  );

  server.registerTool(
    "trail_get",
    {
      description: "Return the complete validated trail.",
      inputSchema: z.object({ trail_id: z.string() }),
    },
    async (input) => runTool(() => ops.get(input)),
  );

  server.registerTool(
    "trail_set_current_context",
    {
      description: "Replace only the evolving current-state narrative. Does not alter canonical_context.",
      inputSchema: z.object({
        trail_id: z.string(),
        current_context: z.string(),
      }),
    },
    async (input) => runTool(() => ops.setCurrentContext(input)),
  );

  server.registerTool(
    "trail_append_event",
    {
      description: "Append a meaningful occurrence or contribution. Events are append-only.",
      inputSchema: z.object({
        trail_id: z.string(),
        summary: z.string(),
        by: z.string().optional(),
      }),
    },
    async (input) => runTool(() => ops.appendEvent(optionalBy(input))),
  );

  server.registerTool(
    "trail_record_decision",
    {
      description: "Append an explicit durable decision. Does not rewrite canonical context.",
      inputSchema: z.object({
        trail_id: z.string(),
        summary: z.string(),
        by: z.string().optional(),
      }),
    },
    async (input) => runTool(() => ops.recordDecision(optionalBy(input))),
  );

  server.registerTool(
    "trail_get_next_actions",
    {
      description: "Return open next actions and updated_at.",
      inputSchema: z.object({ trail_id: z.string() }),
    },
    async (input) => runTool(() => ops.getNextActions(input)),
  );

  server.registerTool(
    "trail_set_next_actions",
    {
      description: "Replace the current next-action set. The service generates action IDs.",
      inputSchema: z.object({
        trail_id: z.string(),
        actions: z.array(actionTextSchema),
      }),
    },
    async (input) => runTool(() => ops.setNextActions(input)),
  );

  return server;
}

function optionalBy(input: {
  trail_id: string;
  summary: string;
  by?: string | undefined;
}): {
  trail_id: string;
  summary: string;
  by?: string;
} {
  if (input.by === undefined) {
    return { trail_id: input.trail_id, summary: input.summary };
  }
  return { trail_id: input.trail_id, summary: input.summary, by: input.by };
}

async function runTool(fn: () => Promise<unknown>) {
  try {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(await fn()) }],
    };
  } catch (err) {
    if (err instanceof ProtocolError) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ code: err.code, message: err.message }),
          },
        ],
      };
    }
    throw err;
  }
}

async function main() {
  const trailsDir = process.env.TRAILS_DIR ?? join(import.meta.dir, "../.trailz");
  const server = createMcpServer(createProtocol({ trailsDir }));
  await server.connect(new StdioServerTransport());
}

if (import.meta.main) {
  await main();
}
