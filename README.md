# BrainTrailz Protocol

A vendor-neutral protocol for persistent, portable human-AI context.

BrainTrailz gives independent AI environments a common trail to read and update so work can move between them without requiring the human to reconstruct the project at every handoff.

For the durable product and architectural intent, read [`VISION.md`](./VISION.md).

This README is the current implementation truth for the Telephone MVP.

---

## MVP hypothesis

A durable trail can pass through **1 + N independent AI environments** without semantic drift caused by repeated human or AI recaps.

The trail must preserve canonical context while allowing legitimate new state to accumulate.

The MVP is the **Telephone experiment**.

MCP, JSON, Git, TypeScript, and adapters are implementation choices used to run that experiment. They are not the product hypothesis.

## What the Telephone experiment proves

Start with one small trail containing a known canonical seed.

Pass control from Client A to Client B to Client C and beyond.

Each client:

1. retrieves the trail itself;
2. receives no recap of the previous client's conversation;
3. interprets the trail;
4. may add one legitimate, typed contribution; and
5. leaves the trail usable by the next participant.

At the end, compare the final trail with the initial seed and the intentional changes.

We are proving that:

- canonical facts remain canonical facts;
- the objective and constraints survive handoffs;
- later observations remain distinguishable from the seed;
- decisions are explicit;
- useful state can accumulate;
- a new client can resume without a human recap; and
- participant N+1 can join without a protocol change.

We are **not** proving that different AIs produce identical wording.

## Core invariant

Ordinary client participation must not alter canonical context accidentally.

The trail separates five kinds of state:

1. **canonical context** — protected baseline meaning;
2. **current context** — evolving description of the present state;
3. **decisions** — explicit durable commitments or changes in direction;
4. **events** — meaningful occurrences or contributions;
5. **next actions** — current continuation points.

This separation is the technical mechanism behind the Telephone test.

## MVP architecture

```text
AI client
   |
adapter / client configuration
   |
MCP
   |
BrainTrailz protocol operations
   |
TrailStore
   |
JSON files + Git
```

### Transport

MCP is the first transport.

The protocol must not depend on MCP semantics internally. A future transport should be able to expose the same operations.

### Persistence

One JSON file per trail in a Git repository.

Git provides:

- readable history;
- diffs;
- rollback; and
- a simple audit trail.

No database is required for the MVP.

Storage sits behind a `TrailStore` abstraction and is not part of client semantics.

### Runtime

Use a small TypeScript/Bun service.

No UI is required.

## Trail identifier

`trail_id` must match:

```text
^[a-z0-9][a-z0-9-]{0,63}$
```

## Trail schema

MVP schema version: `0.2`.

```json
{
  "schema_version": "0.2",
  "trail_id": "telephone-001",
  "title": "Telephone Test 001",
  "purpose": "Prove that canonical context survives AI handoffs.",
  "canonical_context": {
    "seed": "Original message.",
    "facts": [
      "Fact one.",
      "Fact two."
    ],
    "objective": "Objective.",
    "constraints": [
      "A constraint."
    ]
  },
  "current_context": "",
  "decisions": [],
  "events": [],
  "next_actions": [
    {
      "id": "a-001",
      "text": "Pass the trail to the next participant.",
      "status": "open"
    }
  ],
  "updated_at": "2026-08-30T18:00:00Z"
}
```

Unknown top-level fields are rejected in 0.2.

### Protected state

`canonical_context` is the experiment control.

Ordinary MCP operations cannot replace it.

For the MVP, intentional canonical changes are made outside the ordinary client operation set. A later protocol version may add an explicit amendment operation with provenance.

### Evolving state

These fields may change through defined operations:

- `current_context`
- `decisions`
- `events`
- `next_actions`
- `updated_at`

## Protocol operations

The MVP exposes seven operations.

### `trail_create`

Creates a new validated trail.

Inputs:

- `trail_id`
- `title`
- `purpose`
- `canonical_context`
- optional initial `next_actions`

Fails if the `trail_id` already exists.

### `trail_get`

Returns the complete validated trail.

Input:

- `trail_id`

### `trail_set_current_context`

Replaces only the evolving current-state narrative.

Inputs:

- `trail_id`
- `current_context`

Must not alter `canonical_context`.

### `trail_append_event`

Appends a meaningful occurrence or contribution.

Inputs:

- `trail_id`
- `summary`
- optional `by`

The service generates the event ID and timestamp.

Events are append-only.

### `trail_record_decision`

Appends an explicit durable decision.

Inputs:

- `trail_id`
- `summary`
- optional `by`

The service generates the decision ID and timestamp.

A decision records a deliberate change in understanding or direction. It does not rewrite the canonical seed.

Decisions are append-only.

### `trail_get_next_actions`

Returns open next actions and `updated_at`.

Input:

- `trail_id`

### `trail_set_next_actions`

Replaces the current next-action set.

Inputs:

- `trail_id`
- `actions`

The service generates action IDs.

### No generic save

There is no generic whole-trail save operation.

A generic save would allow a client to rewrite protected or historical state accidentally.

Operations express intent and limit each mutation to the fields it is authorized to change.

## Mutation requirements

Every mutation must:

1. validate input;
2. load the current trail;
3. modify only fields authorized by that operation;
4. validate the resulting trail;
5. update `updated_at`;
6. write atomically; and
7. optionally create a Git commit.

Recommended commit form:

```text
trail(<trail_id>): <operation>
```

Git metadata is an implementation detail. It is not required in the trail schema.

## Architecture seams

Keep these boundaries explicit even though the MVP has one implementation of each.

```text
TrailStore
  create(trail)
  get(trailId)
  mutate(trailId, mutation)

TrailValidator
  validate(trail)

ProtocolOperations
  create
  get
  setCurrentContext
  appendEvent
  recordDecision
  getNextActions
  setNextActions

Transport
  expose(ProtocolOperations)
```

MCP implements `Transport` for the MVP.

## Common client behavior

Every participating client should receive the same instruction:

> Retrieve the BrainTrailz trail before asking the human to reconstruct existing project context. Treat canonical context as the protected baseline. Distinguish your interpretation from established facts and explicit decisions. Record only meaningful events or decisions. Leave next actions usable by the next participant.

No client receives special authority.

## Reference clients

Treat these as peers:

- ChatGPT
- OpenAI Codex
- Cursor
- Claude
- Gemini
- Grok
- Muse

Connect the easiest clients first.

The order has no architectural significance.

Do not change the trail model or core operations to accommodate one client.

## Telephone test procedure

### Test A — Baseline

1. Create `telephone-001`.
2. Record the exact canonical seed.
3. Commit it.
4. Ask Client A to retrieve the trail.
5. Ask Client A to explain the seed, facts, objective, constraints, and next action.
6. Verify the explanation against the canonical trail.

### Test B — First handoff

1. Let Client A append one clearly labeled observation.
2. Move to Client B.
3. Give Client B only the trail identifier and access to BrainTrailz Protocol.
4. Do not provide a human recap.
5. Ask Client B to identify:
   - the original seed;
   - original facts;
   - later observations;
   - decisions; and
   - the next action.
6. Verify that Client B separates canonical state from later contributions correctly.

This is the first meaningful proof.

### Test C — Chain

Repeat with Clients C and D.

Each client may add one meaningful, clearly typed contribution.

No client receives the previous client's conversational transcript.

### Test D — Drift comparison

At the end:

1. compare canonical context field-for-field with the initial commit;
2. review accumulated events and decisions;
3. verify that new material is additive and attributable rather than silently merged into the seed;
4. verify that current context and next actions evolved only through their defined operations.

### Test E — 1 + N

Configure one additional compatible client.

Do not modify:

- the trail schema;
- operation names;
- existing trails; or
- core protocol semantics.

If the new client can retrieve and contribute through the same contract, the MVP has passed its first 1 + N architectural test.

The client may require adapter or configuration work. That is expected.

## Assertions

Automated or manual checks must verify:

- canonical seed unchanged;
- canonical facts unchanged;
- canonical objective unchanged;
- canonical constraints unchanged;
- events append-only;
- decisions append-only;
- current context may evolve;
- next actions may evolve; and
- no vendor-specific top-level fields appear.

## Build order

### 1. Repository and schema

Create:

- `VISION.md`
- `README.md`
- schema/types
- schema validator
- filesystem `TrailStore`
- `telephone-001`

### 2. Protocol operations

Implement the seven operations.

Test mutation boundaries before connecting an AI client.

### 3. MCP transport

Expose the seven operations through MCP.

Verify each operation directly.

### 4. First client

Connect the easiest reference client.

Complete the baseline test and one legitimate update.

### 5. Second client

Resume the same trail with no human recap.

Complete the first handoff test.

### 6. Additional clients

Add clients opportunistically.

The protocol must not care which participant is second, third, or tenth.

### 7. Capture evidence

Keep:

- the initial trail;
- the final trail;
- Git history/diff;
- each client's short interpretation; and
- adapter/setup notes.

## Definition of done

The Telephone MVP is done when:

- a canonical seed exists;
- ordinary operations cannot silently rewrite it;
- at least two independent AI clients retrieve the same trail;
- a later client correctly distinguishes the seed from additions;
- useful state accumulates across handoffs;
- no human recap is required between clients; and
- another compatible client can be added without changing the protocol or schema.

A third or fourth client strengthens the demonstration but does not replace the N+1 architectural test.

## Out of scope

Do not add these to the MVP unless they become necessary to pass the Telephone experiment:

- production authentication;
- multi-user permissions;
- database infrastructure;
- vector search;
- embeddings;
- knowledge graphs;
- transcript ingestion;
- automatic summarization;
- autonomous orchestration;
- ISM integration;
- polished UI;
- hosted SaaS;
- cross-trail relationships; or
- exhaustive support for every client.

## Security posture

The MVP assumes a trusted single user and trusted repository.

Any remote or shared deployment requires authentication, authorization, tenant isolation, audit policy, secret management, and input limits.

Do not present the MVP as production-secure.


## What comes after the MVP

Only after the Telephone experiment succeeds should the project consider:

- canonical amendment with explicit provenance;
- stronger concurrency control;
- additional persistence engines;
- authentication and authorization;
- richer artifact references;
- automated context maintenance;
- semantic retrieval;
- cross-trail relationships; or
- deeper integration with ISM.

First prove that the card survives the room.
