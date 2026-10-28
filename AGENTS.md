# Project instructions

## Project records

Apply [maintain-project-records](.agents/skills/maintain-project-records/SKILL.md) when maintaining `JOURNAL.md`, `ASSUMPTIONS.md`, or `DECISIONS.md`, and after meaningful investigation, feedback, accepted interpretations or engineering choices, and verification. Update only the documents warranted by the exchange; skip routine activity logs.

Rafael implements the assessment. Codex assists and maintains the records, attributing contributions and checks accurately. Coordinate or delegate to other agents when requested.

Keep documentation-maintenance skills scoped to this repository. Do not install or modify global user skills for this workflow.

## Documentation kinds

Guides in `docs/` describe the project as it is and act as instructions: present tense, no attribution, status, history, or proposals. Records (`JOURNAL.md`, `ASSUMPTIONS.md`, `DECISIONS.md`) hold history, accepted positions, and rationale. Snapshots (`docs/data-research.md`, `docs/explorations/`) capture one moment and are not kept current. Follow the writing rules for each kind in [maintain-project-records](.agents/skills/maintain-project-records/SKILL.md).

## Code comments

Use brief, focused comments when they explain context or reasoning that the code does not make clear. Keep comments synchronized with code changes, and use relative paths for references when helpful.

## Useful project instructions

Use this index to select context for the current task; do not load every document by default. Add one subsection per useful document, with a short summary, a reason to read it, and its relative link. Keep detailed guidance in the linked file.

### Project structure and architecture

Layers and their import rules, data flow, core concepts, invariants, error handling, conventions, and where each kind of change belongs. Read before placing code, adding a module, or changing layer boundaries; it links to the focused guides below.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

### Routing domain

Order reconstruction and the edit window, bundle expansion into product demand, the seven routing rules mapped to their functions, reservation, output format, and unsupported cases. Read before changing a rule, the coordinator, or the output.

[docs/routing.md](docs/routing.md)

### Input contracts

What each dataset accepts and what its parsed output looks like, field by field. Read before relying on a parsed field or changing what a schema accepts.

[docs/input-contracts.md](docs/input-contracts.md)

### Schema contracts and normalization patterns

The conventions for composing Zod contracts, guarded ingestion and its known limitation, input/output types, branded SKUs and postal values, transformations, and focused tests. Read before writing schemas, changing normalization, or treating parsed records as domain entities.

[docs/schemas.md](docs/schemas.md)

### Development and testing

Toolchain, commands, test layout, independent expected outputs, `routes.txt`, and the checks to run before finishing. Read before running or adding tests or changing tooling.

[docs/development.md](docs/development.md)

### Input data research

A snapshot of the initial investigation of the four datasets: structures, counts, relationships, and data-quality findings. Use it for observations about the supplied data; the interpretations it lists as unresolved are settled in the assumptions record.

[docs/data-research.md](docs/data-research.md)

### Explorations

Snapshots comparing alternatives before a decision, linked from the rationale in the decisions record. Read only when you need the reasoning behind a decision.

[docs/explorations/](docs/explorations/)

### Behavioral assumptions and open questions

Accepted interpretations of unspecified behavior, with unresolved questions kept separate. Read when handling ambiguous inputs or checking whether a proposed interpretation has already been adopted.

[ASSUMPTIONS.md](ASSUMPTIONS.md)

### Engineering decisions and proposals

Accepted engineering choices and their rationale, with unaccepted proposals kept separate. Read before choosing or revisiting an approach that materially affects the solution or its evaluation.

[DECISIONS.md](DECISIONS.md)

### Progress and AI collaboration

The chronology of meaningful investigation, Rafael's direction and feedback, agent contributions, and verification. Read when recovering project context or understanding how an outcome was reached; use the assumptions and decisions documents for current accepted positions.

[JOURNAL.md](JOURNAL.md)
