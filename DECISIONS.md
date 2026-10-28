# Engineering decisions

Rafael's accepted engineering choices that materially affect the solution or its evaluation, together with their rationale and relevant trade-offs. Documentation conventions and minor operational choices do not need entries here.

## Layered project structure

**Decision:** Adopt Rafael's proposed layout separating application coordination, domain rules, file repositories, input schemas, and normalization, with adjacent unit tests and a separate integration-test directory. Establish empty files first.

**Rationale:** The boundaries make data flow and ownership explicit. Empty files were established first while behavioral policies were explored; the later decisions below refine normalization and the direction of repository access. See [the architecture document](docs/ARCHTECTURE.md) for current responsibilities and implementation status.

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

**Decision:** Require product and bundle arrays, string identifiers and names, nonnegative integer numeric prices, and positive integer numeric component quantities. Reject unknown object fields and blank identifiers/names. Require at least one component per bundle; permit empty root product and bundle arrays. Preserve accepted values without coercion or trimming, except for the subsequently adopted uppercase SKU transformation below.

**Rationale:** Rafael agreed with the catalog model and directed work on this first dataset. The supplied field types are consistent, so no string/number unions are needed here. No identifier grammar or fixed catalog size is inferred from the sample. See [the catalog contract](docs/ARCHTECTURE.md#catalog-contract) for details.

The original no-case-change baseline has been superseded for SKUs by [uppercase normalization](ASSUMPTIONS.md#canonical-uppercase-sku-identifiers). Other field constraints remain unchanged.

## Order-event input model

**Decision:** Model the `orders.json` input as a discriminated union of creation and edit events, with shared sub-contracts and inferred event types. Keep the reconstructed order entity separate from the input event contracts.

**Rationale:** Rafael explicitly clarified that the supplied records are order events. Separate event variants make their different required fields visible without mixing complete-order reconstruction into validation. See [the order-event contract](docs/ARCHTECTURE.md#order-event-input-contract) for the implemented structural rules and their limits.

## Shared raw JSON loader placement

**Decision:** Place the raw JSON loader and its adjacent tests in `src/lib/loader/`, keeping `data/` for JSON datasets. The loader returns `unknown`, with Zod validation and normalization left to separate consumers. Repositories can delegate raw file access to this helper when implemented.

**Rationale:** Rafael selected this location after reviewing the loader created in a side conversation. It preserves the separation between fixtures and executable code and brings the loader and tests under the existing TypeScript project configuration. Dataset URLs remain relative to the loader module, adjusted for its new directory.

## Guarded JSON ingestion boundary

**Decision:** Use the existing guarded `parseJson` function or dataset loaders before applying Zod contracts to application input JSON. Retain the parser's rejection of `__proto__`, `constructor`, and `prototype` as object keys at any depth. Document direct-schema bypasses as a known limitation without adding more schema guards at this stage.

**Rationale:** Rafael accepted the current coverage and broader reserved-key policy, explaining that `constructor` and `prototype` are not expected SKU keys. Guarded parsing prevents the reviewed silent key loss along the loader path. The restriction concerns object keys, not string values; it does not establish a new SKU value grammar or normalization rule. See [the ingestion boundary](docs/ARCHTECTURE.md#guarded-json-ingestion).

## SKU transformation at the input boundary

**Decision:** Keep uppercase conversion in a pure function in `src/normalization/sku.ts`, composed by a Zod input contract through `.transform(normalizeSku).pipe(CanonicalSkuSchema)`. Infer accepted source types with `z.input` and canonical output types with `z.output`; use a branded SKU output to distinguish validated canonical identifiers from arbitrary strings. Keep these small contracts in the existing schema layer, with domain consumers using type-only imports where appropriate. Omit additional collision refinements under Rafael's [supplied-data assumption](ASSUMPTIONS.md#no-distinct-sku-collisions-after-normalization).

**Rationale:** Rafael approved Zod transformations to keep this boundary simple and reusable. A separate normalization stage remains a viable alternative but requires callers to remember it. Uppercase conversion alone still infers `string` on both sides; branding supplies a static distinction and does not replace runtime checks. The canonical contract enforces nonblank uppercase strings, preserving the existing acceptance breadth and whitespace behavior without inventing an abbreviation grammar. Schema-derived types avoid duplication at the cost of compile-time coupling to the contracts.

Parsed catalog records and order events remain boundary data; normalization does not reconstruct complete domain orders or prove catalog membership. The earlier collision-rejection recommendation was not adopted. Additional error/result abstractions suggested in the linked discussion are outside this decision. See [schema guidance](docs/schemas.md) for implementation conventions and [ASSUMPTIONS.md](ASSUMPTIONS.md#open-questions) for remaining behavioral questions.

## Separate postal assessment from source ZIP

**Decision:** Preserve source JSON and the original input object while producing a separate normalized output. Every parsed destination requires string `shipTo.zip`. Derive assessment only when `shipTo.country === "US"`, using the raw ZIP type before text conversion. For recognized US destinations, put the normalized string in output `zip`; assessment contains only kind and prefix. Missing/null/omitted values become `""`; unrecognized and outside-US values become text without postal repair. Preserve country and state. Outside-US assessment remains explicit null.

```ts
type PostalAssessmentOutput =
  | { kind: "recognized"; prefix: ZipPrefix }
  | { kind: "missing" }
  | { kind: "unrecognized" };
```

Recognized output ZIPs are checked through `ZipValueSchema`, retaining complete supported ZIP+4 strings. Their assessment prefix must match output ZIP's first three digits. For example, raw numeric `2134` becomes output `zip: "02134"` with `postalAssessment: { kind: "recognized", prefix: "021" }`, while the input object remains unchanged. `ShipToOutput.zip` is statically `string` across all branches; standalone `ZipValue` and assessment prefixes retain their branded types. Representation conversion applies only after raw structural validation and never adds recognition or repair rules.

**Implementation status:** The [shared ZIP contracts](src/schemas/zip.schema.ts) reject a duplicated assessment value. The pure US helper returns output ZIP and assessment together; a separate pure text helper serves outside-US representation without invoking US recognition. The destination transform composes strict raw validation, country gating, output conversion, and output checks. Prefix correspondence is now checked against sibling output `zip`. Compatibility exports and raw recognition rules are preserved.

Do not use `state` for ZIP inference or cross-checks, normalize country, or trim ZIP strings. Apply the [accepted numeric and string recognition rules](ASSUMPTIONS.md#zip-recognition-and-repair-by-raw-type). US country context establishes applicability, not ZIP correctness. Postal verification, zone lookup, PARTNER selection, and warehouse eligibility/ranking remain outside the assessment and are not implemented here.

**Rationale:** Rafael identified duplication between ZIP and assessment, clarified that parsed output should be normalized, and authorized changing the implementation after confirming the complete string representation. Source preservation and transformed-output preservation are different requirements. This supersedes the earlier raw-valued parsed ZIP contract while retaining exact country matching, no trimming, bounded numeric repair, missing/unrecognized classification, and country bypass. Consume parsed output rather than reparse it as raw source input.

## Routing responsibility and downstream fulfillment

**Decision:** Scope this application to routing from the essential data in supplied events, preserving source postal information and deriving only the postal assessment needed by routing. Keep complete-address retrieval, postal correction/verification, and physical fulfillment in downstream systems under the [partial-event/downstream-lookup assumption](ASSUMPTIONS.md#partial-events-and-downstream-delivery-details).

**Rationale:** Rafael separates selecting a responsible warehouse from obtaining a complete shipping address and carrying out delivery. This keeps the assessment proportional to its routing rules without inventing integration work. The assumed downstream use of `orderNumber` is not evidence that a lookup service exists, and this decision does not authorize building one.

## Incremental routing development from CLI acceptance

**Decision:** Develop Part A incrementally through a readable coordinator, named domain functions, and focused tests, progressing until a supported application integration scenario passes. The initial CLI test was replaced after Rafael selected raw TypeScript fixtures supplied through mocked loaders. All repositories, schemas, domain functions, coordinator, and output formatting remain real in this test. Expected output stays independently established.

**Rationale:** Rafael wants the assessment rules visible while retaining incremental development and unresolved policies. A handwritten synthetic scenario with [independent calculations](tests/fixtures/cli-routing/README.md) supplied the first completion signal. Empty ranking lists reach fallback, and reservation precedes the next order. After adopting the bundle interpretation below, coverage expanded to bundle scenarios, the real supplied datasets with independently calculated final stock, and the actual `pnpm start` CLI path.

## Domain access to repositories and run-local routing context

**Decision:** Use the dependency flow CLI → application → domain → repositories → loaders and schemas. `routeOrders()` accepts no source arguments and imports only domain modules. Domain initialization calls parameterless repositories and returns parsed events, catalog, zones, and inventory in a fresh `RoutingContext`. The coordinator carries inventory updates through this context and publishes through a domain function that delegates to the routes repository.

**Rationale:** Rafael corrected the previous coordinator's source and repository ownership. Repositories encapsulate ingestion through their respective existing loaders; source paths stay below the domain layer. A context per run avoids global mutable stock and explicit reset machinery. Domain rule functions can still evaluate supplied in-memory records; this design needs neither a service class per rule nor a dependency-injection framework. Repository references to domain output types remain type-only, avoiding a runtime import cycle.

## Component-based bundle fulfillment

**Decision:** Implement the [adopted component-stock interpretation](ASSUMPTIONS.md#bundle-stock-from-standalone-components) in `domain/catalog.ts`'s existing `resolveOrderProducts`. Multiply each component quantity by the requested bundle quantity, then aggregate all demand for the same canonical product. Keep original reconstructed order lines unchanged. Feed the same flat product demand to eligibility, existing cover calculation, and reservation at one warehouse.

**Routing constraints:** Apply all seven [Part A rules](INSTRUCTIONS.md#part-a-order-router-about-40-minutes) unchanged. Reconstruct complete orders with eligible additions and process them in creation order. Country and accepted postal checks precede expansion. Retain enabled warehouses able to supply every expanded product, then retain the lowest zone before considering cover. Among zone ties, maximize minimum component-product `available / dailyVelocity` using pre-reservation stock; resolve remaining ties with WH-NJ, WH-GA, WH-NV, WH-TX. Preserve empty candidates through selection and apply PARTNER fallback when none qualify. Reserve the aggregated components only at the selected warehouse before the next order; PARTNER outcomes reserve no internal stock. Expansion changes demand, not zone values, rule precedence, or the cover formula.

**Example and boundary:** Two `NW-BNDL-ESS` plus one direct `NW-VITD-60` become three vitamin D and two magnesium units. The same aggregation includes eligible edit additions. Repositories continue loading and parsing; schemas continue validating structure and accepted normalization. The existing catalog domain function performs cross-record interpretation without changing original order lines or source JSON. A known component absent from a warehouse's stock makes that warehouse ineligible; a component absent from the standalone product catalog is an unsupported reference rather than an inventory shortage.

**Rationale:** The catalog explicitly defines bundle components, while every warehouse stocks only standalone products and supplies no bundle stock or velocity. Component interpretation uses those supplied values without inventing a separate inventory model. Restrict expansion to components referencing standalone catalog products; nested bundles and unknown references fail explicitly rather than trigger recursive resolution or silently disappear. General unknown-SKU routing behavior remains open. A dedicated bundle-stock model would need additional inventory data.

**Implementation status:** Rafael authorized completing the work using the consolidated bundle understanding. Domain tests, bundle application scenarios, real-file routing/final-stock checks, and a real CLI test pass. The [supplied-data expected output](tests/fixtures/assessment/expected.txt) and [manual ledger](tests/fixtures/assessment/README.md) were established before implementing expansion and are independent of application output. `routes.txt` captures the matching verified CLI output. No recursive bundle resolution, source-data mutation, repository/configuration changes, or new dependencies were introduced.

## Proposals

No additional engineering proposals awaiting acceptance are recorded here. Remaining SKU questions are in [ASSUMPTIONS.md](ASSUMPTIONS.md#open-questions).
