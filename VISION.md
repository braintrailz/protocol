# BrainTrailz Protocol — Vision

## Purpose

BrainTrailz Protocol exists to preserve the meaning and state of work as a human moves among AI environments.

Today, context is usually trapped inside a conversation, a vendor memory system, or a tool-specific project. Moving work to another AI often requires a recap. Repeated recaps create a game of Telephone: each handoff can omit, reinterpret, or invent something.

The human becomes the integration layer.

BrainTrailz changes the unit of continuity from the conversation to the **trail**.

## The trail

A trail is the durable state of an endeavor.

It carries what another capable participant needs to continue the work:

- what the work is;
- why it matters;
- what is established;
- what has been decided;
- what has happened;
- what should happen next; and
- where important artifacts live.

A trail is not a transcript. It is not a prompt archive. It is not an AI vendor's memory. It is not an agent framework.

Conversations interpret the work. The trail preserves the work.

## Core invariant

**Interpretation may change. Canonical context must not change accidentally.**

A participant may explain, question, extend, or act on a trail. Useful state may accumulate. But ordinary participation must not silently rewrite the baseline facts, objective, or constraints merely because an AI summarized them differently.

When the work itself changes, the change must be explicit.

## Telephone

The simplest way to understand the problem is the game Telephone.

In Telephone, one person whispers a message to the next. The last person often receives a different message even though nobody intended to change it.

AI handoffs create the same failure mode when one system receives another system's recap, then produces a new recap for the next.

BrainTrailz replaces the chain of whispers with a shared card.

Every participant reads the same durable trail. Each may contribute new information, but the original context remains distinguishable from later additions.

The first proof of BrainTrailz is therefore a Telephone test: pass work through independent AI environments without a human recap and verify that canonical meaning survives while legitimate new state accumulates.

## 1 + N

BrainTrailz is not a bridge between two AI products.

It is **one trail + N participants**.

Adding participant N+1 must not require changing the trail schema or redesigning the core service. Environment-specific differences belong in adapters and configuration.

The protocol is successful only if a new participant can join without becoming a special case.

## Ownership

The durable context belongs to the human.

Vendor memory answers:

> What does this AI remember?

BrainTrailz answers:

> What must survive when I leave this AI?

A trail must remain portable across vendors, clients, models, and future systems.

## Architectural doctrine

### Keep the center clean

The common trail model contains shared meaning, not vendor quirks.

Adapters are expected to change. The trail contract should change much more slowly.

### Expect aggregation

If useful capabilities exist behind separate systems, somebody will aggregate them.

BrainTrailz should not compete by becoming another place the user must live. It should be the context layer underneath whatever interface the user chooses.

### Separate protocol from implementation

The trail contract is the durable idea.

MCP is the first transport.

JSON files and Git are the MVP persistence implementation.

None of those implementation choices defines the protocol.

### Prefer explicit mutation

Operations should express intent.

A client may append an event, record a decision, update current context, or replace next actions. It should not receive a generic operation that allows it to rewrite the whole trail and accidentally convert interpretation into history.

## Reference environments

The initial proving set is:

- ChatGPT
- OpenAI Codex
- Cursor
- Claude
- Gemini
- Grok
- Muse

They are peers and examples, not a boundary.

Open-source clients, alternative model providers, and future systems must be able to participate through the same contract.

## MVP proof

The MVP succeeds when independent AI environments can use one trail to:

1. recover the same canonical context;
2. distinguish canonical context from later contributions;
3. add meaningful state without rewriting history;
4. hand work to the next participant without a human recap; and
5. add participant N+1 without changing the core protocol.

The MVP does not need to prove that every AI produces identical prose.

It needs to prove that the work does not lose its identity when the AI changes.

## North star

Start work anywhere.

Continue it somewhere else.

Let every participant bring its own intelligence without depending on a chain of retellings to remember what the work means.

**Conversations are transient. BrainTrailz persist.**
