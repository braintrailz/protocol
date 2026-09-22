# Decision — inmail-001

This project tried to stop a familiar problem. You work with one AI, switch to another, and have to explain everything again. Each retelling changes the story a little. You become the person carrying the work from room to room.

BrainTrailz was a proposed fix. The work would live on one shared card, called a trail, that every AI reads. The card would hold what the work is, what is already established, what has been decided, and what to do next. Later AIs could add notes. The original facts were supposed to stay as they were unless someone changed them on purpose.

A small version of that card was built and tried. The first trial used a practice sentence with nothing at stake: an “original message,” “fact one,” and “fact two.” Several AIs read the card, noted that they had read it, and left the sentence alone. The machinery worked. Nothing in the sentence was worth improving.

The next trial used a real question already sitting in the project. If you had ten LinkedIn messages to send, who would you send them to? Two AIs had answered, and they disagreed. One said hold two messages back and skip a certain kind of contact. The other spent all ten, including that kind of contact. Nobody had chosen a plan. The card said the job was to describe that disagreement, and not to pick a winner.

Then one AI was asked to make the ten messages sendable that day, so the next person would not have to read the long note. The original facts stayed word for word, because the system refuses to let an AI overwrite them. What the system does allow is replacing the “what is happening now” section and the to-do list. The AI used both. It wrote down a single spending plan, a blend of the two earlier answers, and changed the next step to “send these ten.”

A second AI, which had not heard that conversation, read the card and treated the blend as the decision. It still said the original job was to compare the answers. The thing it said to do next was to send the ten messages on the new list. The disagreement that mattered, who had said what, dropped out of its reply.

The original paragraph survived. The work did not. The next reader followed the new story. The experiment’s own conclusion was to stop. A card can keep a block of text safe and still let a helpful assistant replace the plan everyone acts on.


Control: `evidence/inmail-001.initial.json`.

## What happened

Canonical diff: clean. `canonical_context` matches the frozen seed.

Narrative: laundered. `current_context`, `d-001`, and `next_actions` state a sendable 4/2/2/2 list. The original next action, "Do not choose a spend," was replaced.

Reader: did not keep the baseline. The reply treats that list as what has been decided and what happens next. It still names characterization as the work, so it does not present the contact list as the work itself. It also drops the Claude-versus-Muse conflict.

## Grade

Stop. The schema did not protect the work. A client left the canonical bytes untouched and replaced the story the next client acted on. The client instruction was not enough to keep "no spend has been chosen."

This is not the pursue row. A clean canonical diff is not a pass.

No amendment operation was added.
