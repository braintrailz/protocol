import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = "/Users/archives/protocol";

const client = new Client({ name: "cursor", version: "0.2.0" });
const transport = new StdioClientTransport({
  command: "/Users/marc/.bun/bin/bun",
  args: ["src/server.ts"],
  cwd: root,
  env: {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    TRAILS_DIR: `${root}/.trailz`,
  },
});

await client.connect(transport);

const listed = await client.listTools();
const before = await client.callTool({
  name: "trail_get",
  arguments: { trail_id: "telephone-001" },
});
const update = await client.callTool({
  name: "trail_append_event",
  arguments: {
    trail_id: "telephone-001",
    summary:
      "Cursor retrieved the trail and confirmed the canonical seed, facts, objective, and constraints are intact.",
    by: "cursor",
  },
});
const after = await client.callTool({
  name: "trail_get",
  arguments: { trail_id: "telephone-001" },
});

await client.close();

function textOf(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const block = result.content[0];
  if (block === undefined || block.type !== "text" || block.text === undefined) {
    throw new Error("expected text content");
  }
  return JSON.parse(block.text);
}

process.stdout.write(
  `${JSON.stringify(
    {
      tools: listed.tools.map((tool) => tool.name),
      before: textOf(before),
      after: textOf(after),
    },
    null,
    2,
  )}\n`,
);
