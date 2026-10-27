# Engineering decisions

Rafael's accepted engineering choices that materially affect the solution or its evaluation, together with their rationale and relevant trade-offs. Documentation conventions and minor operational choices do not need entries here.

## Layered project structure

**Decision:** Adopt Rafael's proposed layout separating application coordination, domain rules, file repositories, input schemas, and normalization, with adjacent unit tests and a separate integration-test directory. Establish empty files first.

**Rationale:** The boundaries make the data flow and ownership of each responsibility explicit during architectural design. The current task establishes the structure while ZIP, SKU, and bundle policies remain unresolved. See [the architecture document](docs/ARCHTECTURE.md) for the full layout and responsibilities.

## Runtime and development tools

**Decision:** Use Bun as the application runtime, pnpm for package management, TypeScript 6, Zod for input schemas, and Vitest for tests.

**Rationale:** Rafael selected this toolchain when authorizing the scaffold, replacing the earlier Node application-runtime proposal. The tools support typed development, runtime input validation, and focused testing. No comparative performance evaluation was made.

The input-contract approach was subsequently reviewed through the catalog comparison and confirmed in the decision below.

## Catalog input contract approach

**Decision:** Use Zod schemas as runtime input contracts and infer the corresponding TypeScript input types rather than maintaining duplicate hand-written input declarations.

**Rationale:** After comparing static types, manual runtime checks, and Zod contracts, Rafael accepted Zod as the preferred approach. Schema inference keeps the executable contract and input type together. See [the catalog comparison](docs/ARCHTECTURE.md#catalog-input-contract-exploration) for the alternatives and trade-offs. The accepted catalog constraints are recorded below.

## Bounded input permissiveness

**Decision:** Make acceptance field-specific, allowing reasonable input representations supported by the data and documented expectations. Reflect meaningful string/number variation explicitly when appropriate, while rejecting arbitrary types and implausible values for the field. Do not make contracts accept anything.

**Rationale:** Rafael wants contracts that accommodate real input variation without losing useful guarantees. The allowed representations and constraints must follow each field's meaning; this principle does not decide normalization or the three deferred behavioral policies.

## Reusable schema composition

**Decision:** Compose catalog contracts from smaller schemas. Keep the SKU contract in a reusable schema module and share it between product, bundle, and component records. Derive bundles from the product contract and infer exported input types from the schemas.

**Rationale:** Rafael identified SKU as a reusable concept and requested small composable contracts. Sharing the contract keeps its acceptance rules consistent without choosing a normalization policy or duplicating hand-written input types.

## Catalog field constraints

**Decision:** Require product and bundle arrays, string identifiers and names, nonnegative integer numeric prices, and positive integer numeric component quantities. Reject unknown object fields and blank identifiers/names. Require at least one component per bundle; permit empty root product and bundle arrays. Preserve accepted values without coercion, trimming, or case changes.

**Rationale:** Rafael agreed with the catalog model and directed work on this first dataset. The supplied field types are consistent, so no string/number unions are needed here. No identifier grammar or fixed catalog size is inferred from the sample. See [the catalog contract](docs/ARCHTECTURE.md#catalog-contract) for details.

SKU normalization remains a future concern. Rafael left open whether it should run through a Zod transformation or after validation; exact rules and case-insensitive matching remain undecided.

## Order-event input model

**Decision:** Model the `orders.json` input as a discriminated union of creation and edit events, with shared sub-contracts and inferred event types. Keep the reconstructed order entity separate from the input event contracts.

**Rationale:** Rafael explicitly clarified that the supplied records are order events. Separate event variants make their different required fields visible without mixing complete-order reconstruction into validation. See [the order-event contract](docs/ARCHTECTURE.md#order-event-input-contract) for the implemented structural rules and their limits.

## Shared raw JSON loader placement

**Decision:** Place the raw JSON loader and its adjacent tests in `src/lib/loader/`, keeping `data/` for JSON datasets. The loader returns `unknown`, with Zod validation and normalization left to separate consumers. Repositories can delegate raw file access to this helper when implemented.

**Rationale:** Rafael selected this location after reviewing the loader created in a side conversation. It preserves the separation between fixtures and executable code and brings the loader and tests under the existing TypeScript project configuration. Dataset URLs remain relative to the loader module, adjusted for its new directory.

## Guarded JSON ingestion boundary

**Decision:** Use the existing guarded `parseJson` function or dataset loaders before applying Zod contracts to application input JSON. Retain the parser's rejection of `__proto__`, `constructor`, and `prototype` as object keys at any depth. Document direct-schema bypasses as a known limitation without adding more schema guards at this stage.

**Rationale:** Rafael accepted the current coverage and broader reserved-key policy, explaining that `constructor` and `prototype` are not expected SKU keys. Guarded parsing prevents the reviewed silent key loss along the loader path. The restriction concerns object keys, not string values; it does not establish a new SKU value grammar or normalization rule. See [the ingestion boundary](docs/ARCHTECTURE.md#guarded-json-ingestion).

## Proposals

No additional engineering proposals awaiting acceptance are recorded here. The deferred behavioral questions remain in [ASSUMPTIONS.md](ASSUMPTIONS.md#open-questions).
