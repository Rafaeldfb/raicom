---
name: maintain-project-records
description: Maintain this assessment's JOURNAL.md, ASSUMPTIONS.md, and DECISIONS.md after meaningful investigation, user feedback, accepted interpretations, engineering choices, or verification. Skip routine activity logging.
---

# Maintain project records

Maintain the three records at this repository's root. Rafael implements the assessment and owns its decisions; Codex assists and maintains the records. Attribute any authorized agent implementation or investigation to its actual author. This skill is project-scoped and grants no additional implementation, delegation, Git, or external-action authority.

## Read evidence and choose the destination

Read the existing records, relevant conversation, and necessary source material before editing. Use relative project paths in the records. Do not import assumptions or decisions from unrelated projects.

- `JOURNAL.md`: chronology, collaboration, meaningful investigation, feedback, corrections, and verification. Describe Rafael's direction and evaluation of AI when relevant. Distinguish user work, agent work, reported outcomes, and checks actually performed. Skip command transcripts, routine edits, and detailed implementation tracking.
- `ASSUMPTIONS.md`: interpretations Rafael has adopted where the exercise instructions or data do not specify behavior. Explicit requirements and observed data are evidence, not automatically assumptions. Keep unresolved interpretations under `Open questions`.
- `DECISIONS.md`: significant engineering choices Rafael has accepted, with rationale and useful alternatives or trade-offs. Keep unresolved engineering proposals under `Proposals`. Exclude minor operational choices and documentation conventions.

An exchange may warrant only one record. Put the full interpretation or rationale in its reference document; a journal mention should briefly describe its adoption and link there.

## Establish status and attribution

Treat a position as accepted only when Rafael's words or actions clearly establish adoption. A suggestion, illustrative example, question, agent recommendation, or implementation detail alone does not establish acceptance. When acceptance is unclear, keep the item visibly open; ask only when resolution is needed for the task.

Separate requirements, observations, adopted interpretations, proposals, and verified outcomes. Inspect evidence before making factual claims. Describe user or executor reports as reports unless independently checked. Do not mark delegated work complete until the executor reports its outcome, and distinguish that report from independent verification. Do not infer success from an intended action or a command that has merely started.

Preserve the scope of verification: reviewing source files does not establish runtime behavior, and a focused check does not establish that the entire solution is correct. Do not invent metrics, timestamps, decisions, or historical details.

## Write concise entries

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
```

Place accepted entries before the separate `Open questions` or `Proposals` section. Keep those unresolved sections concise and clearly unaccepted. Empty accepted sections are valid; do not populate them speculatively.

## Preserve and reconcile

Make focused edits that preserve existing content and concurrent work. Append journal entries for meaningful developments rather than rewriting the story. Correct inaccurate claims explicitly when material.

When Rafael changes an accepted position, record the change in the journal and update the relevant assumption or decision so the current position is clear. Retain a brief superseded note when useful, rather than silently erasing the earlier choice. Move resolved questions or proposals into accepted entries only when adoption is supported; avoid leaving duplicate active versions.

Before finishing, review the changes for accurate attribution and status, unsupported claims, unnecessary duplication, chronology, and working relative links. Update only records justified by the exchange. Do not stage, commit, or publish documentation unless separately requested.
