# Project instructions

## Project records

Apply [maintain-project-records](.agents/skills/maintain-project-records/SKILL.md) when maintaining `JOURNAL.md`, `ASSUMPTIONS.md`, or `DECISIONS.md`, and after meaningful investigation, feedback, accepted interpretations or engineering choices, and verification. Update only the documents warranted by the exchange; skip routine activity logs.

Rafael implements the assessment. Codex assists and maintains the records, attributing contributions and checks accurately. Coordinate or delegate to other agents when requested.

Keep documentation-maintenance skills scoped to this repository. Do not install or modify global user skills for this workflow.

## Code comments

Use brief, focused comments when they explain context or reasoning that the code does not make clear. Keep comments synchronized with code changes, and use relative paths for references when helpful.

## Useful project instructions

Use this index to select context for the current task; do not load every document by default. Add one subsection per useful document, with a short summary, a reason to read it, and its relative link. Keep detailed guidance in the linked file.

### Project structure and architecture

The accepted project shape, layer responsibilities, intended data flow, development tooling, and implementation status. Read before placing code or changing module boundaries. Consult its guarded JSON ingestion section when connecting loaders and schemas, and its normalization design status before assuming a proposed policy is implemented.

[docs/ARCHTECTURE.md](docs/ARCHTECTURE.md)

### Schema contracts and normalization patterns

The conventions for composing Zod contracts, guarded ingestion, input/output types, branded SKUs and postal values, transformations, and focused tests. Read before adding or consuming schemas, changing normalization, or treating parsed records as domain entities. Distinguishes immutable source data from normalized output, including string ZIPs and recognition based on raw input types.

[docs/schemas.md](docs/schemas.md)

### Input data research

The catalog, order events, warehouses, and zones: their structures, counts, relationships, data-quality findings, and unresolved interpretations. Read before investigating or implementing input handling and validation.

[docs/data-research.md](docs/data-research.md)

### Behavioral assumptions and open questions

Accepted interpretations of unspecified behavior, with unresolved questions kept separate. Read when handling ambiguous inputs or checking whether a proposed interpretation has already been adopted.

[ASSUMPTIONS.md](ASSUMPTIONS.md)

### Engineering decisions and proposals

Accepted engineering choices and their rationale, with unaccepted proposals kept separate. Read before choosing or revisiting an approach that materially affects the solution or its evaluation.

[DECISIONS.md](DECISIONS.md)

### Progress and AI collaboration

The chronology of meaningful investigation, Rafael's direction and feedback, agent contributions, and verification. Read when recovering project context or understanding how an outcome was reached; use the assumptions and decisions documents for current accepted positions.

[JOURNAL.md](JOURNAL.md)
