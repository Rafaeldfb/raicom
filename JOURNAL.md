# Project journal

Meaningful project progress and collaboration, including how Rafael directs, uses, and evaluates AI. Entries use sequential numbers starting at 1 and continuing without a fixed limit. Retrospective entries identify earlier events. This journal complements the AI conversations.

## 1 — Initial setup and collaboration (retrospective)

Rafael reported creating the project folder, placing the supplied assessment resources in `raicom-files/`, and running `git init`. He designated Codex as the main assisting agent, available for direct tasks and coordination when requested, and initially instructed it to wait. Rafael will implement the assessment; Codex will help and maintain the journal.

## 2 — Establishing project records

Rafael defined separate purposes for the journal, accepted assumptions, and significant engineering decisions, emphasizing accurate attribution and a visible distinction between accepted positions and open proposals. Codex reviewed the supplied assessment instructions and operations notes and recommended one shared, instruction-only skill within this repository, with a short `AGENTS.md` pointer. Rafael accepted that documentation approach and requested its creation.

Codex created the three records, the project-scoped skill, and the pointer. [ASSUMPTIONS.md](ASSUMPTIONS.md) keeps the ZIP-format and SKU-matching examples separate from accepted interpretations; [DECISIONS.md](DECISIONS.md) has no accepted engineering choices yet. Codex reviewed the created content and the skill passed the skill-creator structural validator. No assessment implementation or routing-output verification has been performed in this conversation.

## 3 — Development process and AI collaboration preparation

Rafael clarified that the current stage is the "Development Process and AI Collaboration" layer: preparation for the assessment implementation. Codex read the root [INSTRUCTIONS.md](INSTRUCTIONS.md), which asks to see how the candidate directs AI and checks its work. The current work establishes that collaboration process and its records; implementation of the assessment will begin at Rafael's direction. This clarification introduces no behavioral assumption or engineering decision.

## 4 — Investigating the Part A input data

Rafael asked Codex to inspect the catalog, order events, warehouses, and shipping zones to establish their shapes, cardinalities, and data-quality issues before implementation. Codex read all four supplied datasets and used Python to verify JSON parsing, counts, duplicate keys and events, field types, timestamps, and relationships. The files contain three products and one bundle, 27 events for 26 orders, four warehouses with 12 inventory entries, and 52 zone mappings across 13 ZIP prefixes.

The investigation identified mixed ZIP representations, one SKU differing from the catalog only by case, component-based bundle definitions without bundle inventory, and an edit arriving 18 minutes after its order's creation. Codex updated the [open questions](ASSUMPTIONS.md#open-questions) with concrete evidence while keeping interpretations unaccepted. No supplied data was changed and no router was implemented or executed.

## 5 — Preserving the data research

Rafael requested the full research response as a project document, preceded by context explaining its purpose and utility. Codex saved it in [docs/data-research.md](docs/data-research.md), preserving the research content and using relative file links. The opening section explains how the findings support understanding and validation before implementation while keeping unresolved interpretations separate from accepted positions.

## 6 — Refining documentation discovery for agents

Rafael found the initial flat documentation list in `AGENTS.md` insufficient and requested a "Useful project instructions" umbrella section with a subsection for each file. Codex reorganized the index so each entry summarizes the document, explains when to read it, and ends with its relative link. The index covers the assessment requirements, data research, assumptions, decisions, journal, and Part B operations notes, with guidance to load only context relevant to the current task.

## 7 — Limiting the documentation index to the current work

Rafael requested removal of the assessment-requirements and Part B operations entries from `AGENTS.md`, explaining that these pointers could encourage agents to jump ahead and compromise his authorship. Codex removed those two entries; the index now covers data research, assumptions, decisions, and collaboration history. Future assistance should follow Rafael's current task rather than independently advancing toward a complete assessment solution.

## 8 — Preparing working copies of the datasets

Rafael requested copies of the supplied JSON datasets in a root `data/` directory and updates to related file links. Codex copied the catalog, orders, warehouses, and zones without changing their contents, retained the originals in `raicom-files/`, and verified that each copy was byte-for-byte identical. The research and assumptions documents now link to the working copies.

## 9 — Deferring open policies to understand the data flow

After discussing ZIP-handling options, Rafael chose to keep ZIP handling, SKU matching, and bundle stock handling [open](ASSUMPTIONS.md#open-questions) for now. He redirected the discussion toward understanding responsibilities and data flow as part of architectural design for Part A with TypeScript and Node. Codex proposed a flow covering input loading, order assembly, interpretation, sequential routing and stock reservation, and output formatting. This remains a proposal for discussion; Rafael has not accepted a specific architecture or authorized implementation.

## 10 — Establishing the architecture scaffold and toolchain

After discussing input loading and proposing a layered layout, Rafael authorized creation of that structure with empty source and test files. He selected Bun in place of Node as the application runtime, kept pnpm for dependency management, and requested TypeScript 6, Vitest, Zod, and an architecture document. Codex created the scaffold, including the empty routing-output placeholder, initialized pnpm, and installed TypeScript 6.0.3, Vitest 5.0.5, Zod 4.6.7, and Bun type definitions.

Codex saved the responsibilities and intended data flow in [docs/ARCHTECTURE.md](docs/ARCHTECTURE.md), added its entry to the project index, and recorded the accepted structure and tools in [DECISIONS.md](DECISIONS.md). Verification confirmed all 23 source and test files are empty, the dataset copies are unchanged, local documentation links resolve, and the typecheck command succeeds under Bun. A temporary Vitest runner check passed under Node; direct Bun runs timed out, so Vitest currently uses Node tooling. No application tests or routing behavior have been implemented or verified, and the three behavioral questions remain open.
