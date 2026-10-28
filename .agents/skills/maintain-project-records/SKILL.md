---
name: maintain-project-records
description: Maintain this assessment's JOURNAL.md, ASSUMPTIONS.md, and DECISIONS.md after meaningful investigation, user feedback, accepted interpretations, engineering choices, or verification, and keep the guides in docs/ describing the current project when accepted changes alter it. Distinguishes records (history, accepted positions, rationale) from guides (current state and conventions). Skip routine activity logging.
---

# Maintain project records

Rafael implements the assessment and owns its decisions; Codex assists and maintains the records. Attribute any authorized agent implementation or investigation to its actual author. This skill is project-scoped and grants no additional implementation, delegation, Git, or external-action authority.

## Know which kind of document you are editing

The project has three kinds of documents. They answer different questions, so they differ in content, voice, and editing rules. Decide which kind you are editing before writing, and never carry the conventions of one kind into another.

| | Records | Guides | Snapshots |
|---|---|---|---|
| Files | `JOURNAL.md`, `ASSUMPTIONS.md`, `DECISIONS.md` | Documents in `docs/` indexed as instructions in `AGENTS.md`, such as `docs/ARCHITECTURE.md` and `docs/schemas.md` | `docs/data-research.md` and `docs/explorations/` |
| Question answered | How did the project get here, what did Rafael accept, and why? | How is the project built, and how should it be changed? | What was observed or compared at one moment? |
| Main reader | Rafael, reviewers, agents recovering context | Agents and developers about to change code | Readers following a rationale link |
| Voice | Attributed; the journal narrates past events | Present tense, impersonal, normative | Whatever suited the investigation |
| Status, proposals, verification | Allowed in their designated places | Never | Describe that moment only |
| Editing | Append journal entries; reconcile accepted entries | Rewrite in place; delete outdated text | Leave unchanged except to fix broken links |

Read existing documents, relevant conversation, and necessary source material before editing. Use relative project paths. Do not import assumptions or decisions from unrelated projects.

## Records

### Choose the destination

- `JOURNAL.md`: chronology, collaboration, meaningful investigation, feedback, corrections, and verification. Describe Rafael's direction and evaluation of AI when relevant. Distinguish user work, agent work, reported outcomes, and checks actually performed. Skip command transcripts, routine edits, and detailed implementation tracking.
- `ASSUMPTIONS.md`: interpretations Rafael has adopted where the exercise instructions or data do not specify behavior. Explicit requirements and observed data are evidence, not automatically assumptions. Keep unresolved interpretations under `Open questions`.
- `DECISIONS.md`: significant engineering choices Rafael has accepted, with rationale and useful alternatives or trade-offs. Keep unresolved engineering proposals under `Proposals`. Exclude minor operational choices and documentation conventions. Do not describe how the code implements a decision or which checks passed; end the entry with an `Implemented in` line linking to the guide section and source files instead.

An exchange may warrant only one record. Put a full interpretation in `ASSUMPTIONS.md` and full rationale in `DECISIONS.md`; a journal mention should briefly describe the adoption and link there. Unaccepted proposals belong only under `Proposals` or `Open questions`, never in a guide. A long comparison of alternatives belongs in `docs/explorations/`, linked from the decision's rationale.

### Establish status and attribution

These rules apply to records only.

Treat a position as accepted only when Rafael's words or actions clearly establish adoption. A suggestion, illustrative example, question, agent recommendation, or implementation detail alone does not establish acceptance. When acceptance is unclear, keep the item visibly open; ask only when resolution is needed for the task.

Separate requirements, observations, adopted interpretations, proposals, and verified outcomes. Inspect evidence before making factual claims. Describe user or executor reports as reports unless independently checked. Do not mark delegated work complete until the executor reports its outcome, and distinguish that report from independent verification. Do not infer success from an intended action or a command that has merely started.

Preserve the scope of verification: reviewing source files does not establish runtime behavior, and a focused check does not establish that the entire solution is correct. Do not invent metrics, timestamps, decisions, or historical details.

### Write concise entries

Journal entries use this structure, in oldest-to-newest order:

```markdown
## N — Topic

A few concise sentences describing the meaningful exchange, its development,
and the supported outcome or next step.
```

Replace `N` with the next sequential entry number, starting at 1 and continuing without a fixed limit. Append using the last existing entry number plus one, preserving existing numbers and order. Do not include recording dates or times in entry headings. Label retrospective summaries and group related exchanges into meaningful stages. The journal complements the actual AI conversations and does not replace them.

Accepted assumptions use:

```markdown
## Assumption title

**Assumption:** The interpretation adopted.

**Basis and effect:** Why it is reasonable and how it affects the solution,
when relevant.
```

Accepted engineering decisions use:

```markdown
## Decision title

**Decision:** The approach chosen.

**Rationale:** Why it was chosen, including relevant alternatives or
trade-offs when useful.

**Implemented in:** [guide section](docs/guide.md#section) and `src/path.ts`.
```

Omit `Implemented in` until the decision is implemented. Place accepted entries before the separate `Open questions` or `Proposals` section. Keep those unresolved sections concise and clearly unaccepted. Empty accepted sections are valid; do not populate them speculatively.

### Preserve and reconcile

Make focused edits that preserve existing content and concurrent work. Append journal entries for meaningful developments rather than rewriting the story. Correct inaccurate claims explicitly when material. When a linked heading moves, update the link target in older entries without changing their narrative.

When Rafael changes an accepted position, record the change in the journal and update the relevant assumption or decision so the current position is clear. Retain a brief superseded note when useful, rather than silently erasing the earlier choice. Move resolved questions or proposals into accepted entries only when adoption is supported; avoid leaving duplicate active versions.

## Guides

Guides act as instructions for agents through the `AGENTS.md` index. A guide that mixes in history or status makes agents unable to tell a current rule from a past discussion.

### Update only when the project changes

Update a guide when an accepted and implemented change alters what it describes: structure, behavior, contracts, conventions, or commands. A discussion, proposal, review, open question, or verification that leaves the project unchanged does not touch guides; record it in the journal or the relevant record instead. Do not edit a guide to note that something was discussed, reviewed, verified, adopted, or deferred.

### Write the current state

- Describe the project as it is, as if it had always been this way, in present tense and impersonal voice.
- Leave out people, agent roles, conversations, reviews, and dates. Avoid status and time words such as "now", "earlier", "initially", "at this stage", "remains open", "not yet", "was adopted", and "implementation status".
- Leave out proposals, rejected alternatives, and superseded notes. State unsupported behavior as current behavior, for example "nested bundles throw an unsupported-component error", not as pending work.
- Write rules an agent must follow as imperatives: "Use…", "Do not…".
- Rewrite or delete an outdated passage; never append a correction after it.
- Give each fact one home. Link to the guide that owns it, to `DECISIONS.md` for rationale, and to `ASSUMPTIONS.md` for interpretations instead of restating them.
- Leave volatile detail in its source: versions in `package.json`, expected outputs in test fixtures, exhaustive cases in tests.

### Keep the index and links current

When adding, renaming, splitting, or removing a guide, update its `AGENTS.md` index entry with a short summary, when to read it, and its relative link. Fix inbound links from guides and records.

## Review before finishing

For records, check attribution and status, unsupported claims, chronology, unnecessary duplication, and working relative links. Update only records justified by the exchange.

For each changed guide passage, reread it as a newcomer about to change code: it contains no attribution, status, history, or proposals; it matches the code; it does not repeat another guide; and its links resolve.

Do not stage, commit, or publish documentation unless separately requested.
