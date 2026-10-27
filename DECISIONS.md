# Engineering decisions

Rafael's accepted engineering choices that materially affect the solution or its evaluation, together with their rationale and relevant trade-offs. Documentation conventions and minor operational choices do not need entries here.

## Layered project structure

**Decision:** Adopt Rafael's proposed layout separating application coordination, domain rules, file repositories, input schemas, and normalization, with adjacent unit tests and a separate integration-test directory. Establish empty files first.

**Rationale:** The boundaries make the data flow and ownership of each responsibility explicit during architectural design. The current task establishes the structure while ZIP, SKU, and bundle policies remain unresolved. See [the architecture document](docs/ARCHTECTURE.md) for the full layout and responsibilities.

## Runtime and development tools

**Decision:** Use Bun as the application runtime, pnpm for package management, TypeScript 6, Zod for input schemas, and Vitest for tests.

**Rationale:** Rafael selected this toolchain when authorizing the scaffold, replacing the earlier Node application-runtime proposal. The tools support typed development, runtime input validation, and focused testing. No comparative performance evaluation was made.

## Proposals

No engineering proposals awaiting acceptance are recorded yet.
