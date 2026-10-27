# Schema contracts and normalization

This guide defines the conventions for writing and consuming Zod contracts in this assessment. Read it before adding fields, shared contracts, or transformations. It describes current patterns rather than the history of their adoption. Behavioral interpretations live in [ASSUMPTIONS.md](../ASSUMPTIONS.md); engineering rationale lives in [DECISIONS.md](../DECISIONS.md).

## Responsibilities and ingestion boundary

Use this flow for application JSON:

```text
guarded loader → unknown value → Zod validation and accepted transformations
               → typed output → application/domain processing
```

The [loader](../src/lib/loader/Loader.ts) reads and guards JSON, caches raw values, and returns independent copies typed as `unknown`. It does not invoke schemas or normalization. Input repositories will coordinate these steps; they remain placeholders.

Use the guarded loader or `parseJson` before Zod. Plain `JSON.parse`, whether nested inside a schema call or used earlier, bypasses the reserved-key policy. The existing guard rejects `__proto__`, `constructor`, and `prototype` as object keys. Direct schema calls do not supply that protection; see the [known limitation](ARCHTECTURE.md#known-review-limitations).

Consume the parsed output, not the original raw value:

```ts
const rawCatalog = await loadCatalog();
const result = CatalogSchema.safeParse(rawCatalog);

if (result.success) {
  const catalog = result.data; // Validated output, including canonical SKUs.
  // Pass catalog to the next application step.
} else {
  // Preserve result.error.issues for the caller's error handling.
}
```

Use `.safeParse()` when the caller needs an explicit success/error branch. `.parse()` is appropriate when the caller deliberately handles a thrown validation error. Do not catch validation failures and silently replace them with empty data. Application-wide error presentation remains to be designed.

## Compose contracts from shared concepts

Place contracts in `src/schemas/`. Reuse shared value schemas wherever the same concept occurs: `SkuSchema` covers catalog items, bundle components, order lines, and inventory keys. Compose strict objects from field contracts; extend the product contract for bundles and use a discriminated union for order events.

Use `z.strictObject` for fixed record fields so misspellings or extra fields fail visibly. Use `z.record` for actual dictionaries, such as inventory and ZIP-prefix maps. Zones have a deliberate metadata exception: `_note` is a string and other entries are warehouse maps. Do not replace these explicit distinctions with broad permissive schemas.

Accept alternative types only for the relevant field and supported policy. For example, the raw destination ZIP contract permits strings, numbers, and missing representations; catalog prices and item quantities remain numeric. Do not add broad coercion, defaults, trimming, or repair without an adopted rule.

## Separate source types from parsed types

Export `*Input` aliases using `z.input<typeof Schema>` and `*Output` aliases using `z.output<typeof Schema>`. `z.infer` means output, so it must not stand in for an input alias when transformations or brands distinguish the two. The shared canonical identifier is named `Sku`.

These are inferred TypeScript types, not an alternative to runtime parsing. Untrusted loader values remain `unknown` until validated. Avoid duplicate hand-written declarations and casts that pretend a raw value is validated. Domain consumers can import output types with `import type`; this keeps runtime Zod parsing at the boundary while accepting compile-time coupling to the inferred contracts.

Output records are not automatically complete domain entities. An `OrderEventOutput` remains an event; order reconstruction, catalog membership checks, inventory rules, and routing are later responsibilities.

## Transform accepted representations into canonical values

Keep conversion functions pure and synchronous in `src/normalization/`, with no file access, catalog lookup, or mutation. Compose them into boundary schemas with `.transform()` and validate the result with `.pipe()`.

The implemented [SKU contract](../src/schemas/sku.schema.ts) uses:

```ts
export const SkuSchema = z
  .string()
  .transform(normalizeSku)
  .pipe(CanonicalSkuSchema);

export type SkuInput = z.input<typeof SkuSchema>;
export type Sku = z.output<typeof SkuSchema>;
```

The initial string contract rejects nonstrings before conversion. [normalizeSku](../src/normalization/sku.ts) uppercases the string. `CanonicalSkuSchema` rejects blank strings, requires uppercase text without converting it, and brands its output as `Sku`. The brand is a static distinction from arbitrary strings; it neither changes the runtime string nor proves catalog membership. Conversion alone is not validation. See [Zod type inference](https://zod.dev/basics#inferring-types), [transforms and pipes](https://zod.dev/api#pipes), and [brands](https://zod.dev/api#branded-types).

SKU comparison is case insensitive through uppercase canonicalization. The current contract preserves surrounding whitespace and does not enforce an abbreviation grammar, fixed prefix, segment length, or numeric suffix. Supplied identifiers include `NW-VITD-60`, `NW-MULTI-30`, and `NW-BNDL-ESS`; do not infer a strict three-letter product segment or numeric-only ending. The complete identifier grammar and unknown-SKU handling remain open.

The assessment assumes distinct identifiers do not collide after uppercasing. No collision refinements are implemented. This is a bounded data assumption, not a guarantee of `z.record`: transforming differently cased keys to the same output key can overwrite an entry. Keep the assumption visible when changing input sources or normalization rules; do not silently describe collisions as detected or rejected.

## Country-aware postal assessment

Preserve source JSON and the original input object; produce a new normalized destination for the application. [RawZipSchema](../src/schemas/zip.schema.ts) accepts string, finite number, null, or omission. `RawShipToSchema` validates the original strict record. Every parsed `ShipToOutput` requires `zip: string` and a nullable assessment.

Recognition must examine the original raw type before conversion. The destination transform uses country context and composes normalization with output validation:

```ts
export const ShipToSchema = RawShipToSchema.transform((destination) => ({
  ...destination,
  ...(destination.country === "US"
    ? normalizeUsZip(destination.zip)
    : { zip: normalizeZipText(destination.zip), postalAssessment: null }),
})).pipe(ShipToOutputSchema);
```

Only exact `"US"` invokes [normalizeUsZip](../src/normalization/zip.ts), which returns `{ zip, postalAssessment }`. Other country strings, including `"us"` and `" US "`, use the pure text conversion helper without US recognition or repair. Preserve country and state; neither postal appearance nor state determines country eligibility. Existing nonblank field checks remain. Outside-US bypass does not relax raw field types or strictness.

Both helpers are pure, with no runtime Zod, country/state, file, repository, or domain-service dependency. Follow the [raw-type recognition rules](../ASSUMPTIONS.md#zip-recognition-and-repair-by-raw-type) and the [output representation](../ASSUMPTIONS.md#string-zip-representation-in-parsed-output):

| Source ZIP | Parsed ZIP and assessment |
|---|---|
| US number `2134` | `"02134"`; recognized with prefix `"021"`. |
| US string `"2134"` | `"2134"`; unrecognized, without padding. |
| US string `"07030-1834"` | Same complete string; recognized with prefix `"070"`. |
| Missing, null, or omitted US ZIP | `""`; missing. The source omission remains unchanged. |
| Unrecognized US string or number | Preserve string or convert number directly to text; unrecognized. |
| Outside-US string or number | Preserve string or convert number directly to text; null assessment, without US repair. |
| Missing/null/omitted outside-US ZIP | `""`; null assessment. |

Four-digit integers receive one leading zero only in US recognition; five-digit integers become strings. Shorter numbers, fractions, and negatives stay unrecognized. Accept exact five-digit and hyphenated ZIP+4 strings with ASCII digits. Do not trim, remove punctuation, pad short strings, accept nine contiguous digits, or match before a trailing newline. Whitespace-only strings are unrecognized rather than missing.

The [shared assessment contract](../src/schemas/zip.schema.ts) contains only recognition information: `{ kind: "recognized", prefix }`, `{ kind: "missing" }`, or `{ kind: "unrecognized" }`. It rejects `value` and other extra fields. There is no international variant; outside-US assessment is null. The destination output contract checks recognized `zip` through `ZipValueSchema` and verifies its correspondence with the sibling assessment prefix. Missing assessment requires empty ZIP. Format validity, assignment, deliverability, state correspondence, and zone coverage remain distinct concerns.

For source `{ country: "US", state: "MA", zip: 2134 }`, actual parsed output is:

```ts
{
  country: "US", state: "MA", zip: "02134",
  postalAssessment: { kind: "recognized", prefix: "021" }
}
```

The source object still has numeric `2134`; the JSON and loader cache are untouched. Creation-event outputs receive this destination conversion, while edit shapes remain unchanged. An omitted source ZIP produces an explicit empty output string without adding a ZIP property to the input object.

`ShipToInput.zip` remains `string | number | null | undefined`; `ShipToOutput.zip` is always `string`. Recognized format is validated conditionally; the uniform destination ZIP type does not claim every branch is canonical. Standalone `ZipValueSchema` retains its branded scalar output; `PostalAssessmentOutput` contains branded recognized prefixes. The prefix schema is shared with zone-map keys and re-exported by the zones module. Existing raw ZIP imports remain available from the order module.

Keep output validation as a single strict object with conditional checks. With installed Zod 4.6.7, an output root union can discard upstream unknown-key issues in a pipe; this was independently reproduced while revising the output. Regression tests require rejection of extra source fields, injected assessments, and reparsed enriched outputs. Do not replace this boundary without checking those cases.

Structural errors remain distinct from assessment results. Booleans, arrays, objects, and nonfinite ZIP numbers fail raw validation for either country branch. Supported unusable US values remain representable as unrecognized. Direct helper calls classify nonfinite numbers as unrecognized, but application ingestion rejects those before normalization. Explicit output text conversion follows raw validation; broad coercion before recognition would change the accepted numeric-versus-string policy.

Domain consumers can use output types through type-only imports. Parse raw input once and consume the result; do not reparse enriched objects through the source schema. Keep zone lookup, warehouse selection, and PARTNER outcomes outside assessment. The downstream full-order lookup remains an [adopted, unverified assumption](../ASSUMPTIONS.md#partial-events-and-downstream-delivery-details).

## Verify meaningful behavior

Keep unit tests beside contracts and normalization functions. Cover supported representations, rejected types and values, canonical output, unchanged unrelated fields, and preservation of source objects. Check shared behavior through catalog records, both event variants, and inventory keys; a standalone helper test does not prove composition. Type assertions should verify that raw strings and branded outputs differ under `pnpm typecheck`.

Use `pnpm test src/schemas src/lib/loader src/normalization` for the implemented boundary and normalization tests, followed by `pnpm typecheck`. Empty domain test placeholders still prevent treating the full suite as verified. Fixture-only schema tests that use `JSON.parse` isolate contracts; the loader integration test verifies guarded ingestion, supplied ZIP cases, and raw cache preservation.
