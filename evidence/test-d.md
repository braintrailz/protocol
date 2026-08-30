# Test D — Drift comparison

Control: first committed trail in `61ee99f` (`.trailz/telephone-001.json`).
Subject: current `.trailz/telephone-001.json`.

## Canonical context (field-for-field)

| Field | Seed | Now | Drift |
| --- | --- | --- | --- |
| seed | Original message. | Original message. | none |
| facts | Fact one. Fact two. | Fact one. Fact two. | none |
| objective | Objective. | Objective. | none |
| constraints | A constraint. | A constraint. | none |

`title`, `purpose`, `trail_id`, and `schema_version` also match.

## Additive state

- Events: `[]` → `e-001` (cursor), `e-002` (client-c), `e-003` (client-d). Append-only, each attributed.
- Decisions: still `[]`.
- `current_context`: still `""` (never written).
- `next_actions`: still the original open action (never replaced).
- `updated_at`: `2026-08-30T18:00:00Z` → `2026-08-30T20:42:03Z` (mutation timestamps only).
- Top-level keys unchanged. No vendor fields.

## Verdict

Pass. New material is additive and attributable. The seed was not rewritten.
