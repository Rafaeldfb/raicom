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

## 11 — Exploring catalog input contracts before implementation

Rafael asked to start data-layer design by understanding the incoming shapes and assessing whether Zod's complexity is appropriate, despite its earlier inclusion in the scaffold. He first requested confirmation of scope, then agreed to compare the catalog using TypeScript declarations and a Zod contract, with documentation only. Codex reviewed the supplied catalog and official TypeScript and Zod guidance, explaining static typing, runtime checks, inferred input types, error handling, and unknown-property behavior.

The [architecture document](docs/ARCHTECTURE.md#catalog-input-contract-exploration) now contains illustrative alternatives and their trade-offs. Codex recommended a small schema with inferred input types as a [proposal](DECISIONS.md#catalog-input-contract-approach), not an accepted decision. No source files, datasets, or dependencies were changed; ZIP handling, SKU matching, and bundle stock handling remain open.

## 12 — Adopting Zod and modeling bounded catalog acceptance

Rafael accepted Zod input contracts after the comparison and directed that schemas allow reasonable, field-specific input variation without accepting arbitrary data. Codex recorded the adoption and bounded-permissiveness principle in [DECISIONS.md](DECISIONS.md), then revisited the catalog, whose supplied field types are consistent and do not currently require string/number unions.

The [catalog model](docs/ARCHTECTURE.md#catalog-contract) now proposes record shapes, value constraints, and unknown-field behavior for Rafael to review. It distinguishes meaningful small values such as component quantity `1` from malformed input and leaves identifier grammar unspecified rather than inventing it. The detailed constraints remain proposals; no source code was implemented, and ZIP handling, SKU matching, and bundle stock handling remain open.

## 13 — Implementing composed catalog contracts

Rafael agreed with the catalog model, identified SKU as a reusable concept, and directed work on this first dataset through small composable contracts. He retained the no-conversion baseline while explicitly leaving the normalization rules and their placement open, including the possibility of a Zod transformation or a separate stage after validation. Codex implemented a reusable nonblank SKU contract and composed product, component, bundle, and catalog contracts with inferred input types.

Codex added adjacent tests and verified that all 39 focused catalog and SKU tests pass and the Bun-based TypeScript check succeeds. The tests cover the supplied catalog, malformed input, strict object fields, numeric constraints, and preservation of accepted text and casing. Documentation now records the accepted contract and current implementation status. File loading, normalization, bundle stock handling, and routing remain unimplemented; the full suite was not run while the earlier domain and normalization test modules remain empty placeholders. No datasets, dependencies, or staged content were changed.

## 14 — Implementing the warehouse contract before zones

Rafael considered the catalog result good enough to continue and requested warehouse and zone contracts one per turn, allowing Codex to pause for questions when necessary. Codex implemented only the warehouse contract, composing strict warehouse and inventory-entry objects with a reusable warehouse-code sub-contract and the existing SKU contract for inventory keys. It preserves flags and input text, accepts the supplied zero values, and treats stock as an integer count and daily velocity as a nonnegative rate that can include fractions.

All 74 implemented schema tests pass, including 35 warehouse cases, and the Bun-based TypeScript check succeeds. The architecture document records the contract's guarantees and limits, including that fractional velocities are an implementation interpretation rather than a supplied example. Zones remain untouched; file loading, normalization, inventory calculations, and routing are outside this step.

## 15 — Implementing the zones contract

Rafael asked to continue with zones after the warehouse step. Codex composed the contract from three-digit lookup-prefix strings, integer zone values from 1 through 8, and warehouse maps using the existing warehouse-code contract. The schema preserves `_note` as string metadata and requires all remaining entries to be valid warehouse maps, retaining the raw layout and leading zeros without normalization.

All 116 implemented schema tests pass, including 42 new zone cases, and the Bun-based TypeScript check succeeds. The architecture document explains the mixed metadata/map structure and the distinction between lookup-prefix validation and the still-open customer ZIP policy. No order schema, loader, cross-file consistency checks, or routing behavior was implemented in this step.

## 16 — Modeling order events separately from orders

Rafael directed the next schema step and clarified that the input records are order events rather than final order entities. Codex implemented separate strict creation and edit contracts combined through the `type` discriminator, with shared order-number, timestamp, destination, and item-line sub-contracts. Raw ZIP values, absent ZIP representation, SKU casing, event order, and bundle lines are preserved without reconstruction or normalization.

All 170 implemented schema tests pass, including 54 new order-event cases, and the Bun-based TypeScript check succeeds. The architecture documents the structural acceptance rules, including timezone-aware timestamp strings and null as an additional representation of absent ZIP input, and distinguishes these from the deferred postal policy. The event/entity distinction is recorded in DECISIONS.md. No loader, order reconstruction, edit-window enforcement, normalization, or routing was implemented.

## 17 — Independent schema review and assessment of findings

Rafael requested a sub-agent code review and asked the main agent to judge its findings with explicit justification. The reviewer inspected the implemented schemas, tests, documentation, and supplied inputs, independently confirming that all 170 schema tests and typechecking pass. It reported one P2 edge case involving silently discarded `__proto__` dictionary entries and no other actionable findings.

The main agent reproduced the issue in warehouse inventory and the zones root, accepted its correctness, and lowered the priority to P3 because the supplied assessment inputs are unaffected. The [known limitation](docs/ARCHTECTURE.md#known-review-limitations) records the impact and suggested correction. Source files remain unchanged by the review; accepting the finding does not mean a fix has been implemented. The deferred behavioral policies and application implementation remain outside the review scope.

## 18 — Reviewing and relocating the shared raw loader

A side-conversation agent created a guarded raw JSON loader and tests in `data/`, returning `unknown` without schema validation or normalization. The main agent independently confirmed 186 passing loader/schema tests, the remaining direct-schema bypass, and a reproducible TS2591 import diagnostic when the loader was compiled without runtime type declarations. It also confirmed that the project typecheck excluded the two loader files.

Rafael accepted documenting the guarded parsing boundary and the rejection of `__proto__`, `constructor`, and `prototype` as object keys. He explicitly deferred additional guards for direct schema calls and selected `src/lib/loader/` for the shared module and tests. Codex moved the existing files, adjusted all four dataset URLs and test imports, and recorded the [ingestion policy](docs/ARCHTECTURE.md#guarded-json-ingestion) and architecture decision without changing schemas or loader behavior.

All 186 focused tests pass after relocation. Both loader files are now included in the normal project typecheck, which passes with the existing Bun declarations and unchanged import. A Bun smoke check launched from `/tmp` successfully loaded all four datasets, confirming working-directory-independent paths. The TypeScript editor UI was not inspected. The datasets, dependency/configuration files, deferred behavioral policies, and staged content remain unchanged.
