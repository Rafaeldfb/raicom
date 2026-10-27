# Assumptions

Accepted interpretations of behavior that the exercise instructions or supplied data leave unspecified. Explicit requirements remain in the supplied resources and are not repeated as assumptions.

## Canonical uppercase SKU identifiers

**Assumption:** SKU identifiers are case insensitive. Normalize them to uppercase for internal comparison across the catalog, order lines, bundle components, and inventory keys.

**Basis and effect:** Rafael selected uppercase normalization and explicitly accepted case-insensitive matching as proportionate to this assessment. This reconciles order `#2045`'s `nw-mag-90` with `NW-MAG-90` in the catalog and inventory. The shared Zod SKU contract now performs the conversion. This does not establish a complete SKU grammar or a rule for unknown identifiers.

## No distinct SKU collisions after normalization

**Assumption:** Distinct SKU identifiers in the supplied assessment data do not become the same identifier when uppercased. Different casings of one identifier represent that same SKU.

**Basis and effect:** Rafael considers the supplied abbreviation-based identifiers sufficiently controlled for this exercise and chose to omit additional collision refinements. The four distinct catalog identifiers remain distinct after uppercasing; the lowercase order spelling refers to the existing magnesium SKU. This is a dataset-scoped assumption, not a consequence guaranteed by the abbreviation structure. Dynamic inventory-key transformations do not detect collisions and can overwrite values if future inputs violate it. Revisit this assumption if input sources or normalization rules change.

## ZIP recognition and repair by raw type

**Assumption:** For destinations whose country is exactly `"US"`, recognize complete five-digit and hyphenated ZIP+4 strings without trimming. Convert four-digit integers to five-digit strings by adding one leading zero; convert five-digit integers directly to strings. Do not pad shorter numbers or repair four-digit strings. Preserve the source JSON and original input object independently of the transformed output; derive US assessment only where US rules apply.

**Basis and effect:** Rafael adopted this bounded interpretation and clarified its country context in the side conversation relayed to the main agent, then selected exact country comparison and no ZIP trimming while reviewing the implementation plan. Numeric values cannot preserve leading zeros, while strings can. Outside-US destinations bypass US assessment and follow the exercise's international rule. Do not infer country from postal appearance or use `state` for ZIP normalization, validation, inference, or cross-checking. A US country value does not establish that a ZIP is well formed, assigned, deliverable, or correct for the address. Recognition describes a supported format, not postal accuracy or zone coverage. The three US assessment kinds remain recognized, missing, and unrecognized; normalized strings now live in parsed output `shipTo.zip` under the [implemented output contract](DECISIONS.md#separate-postal-assessment-from-source-zip).

| Raw ZIP in a US destination | Output ZIP | Assessment |
|---|---|---|
| Number `2134` | `"02134"` | Recognized, prefix `"021"`. |
| Five-digit integer `30303` | `"30303"` | Recognized, prefix `"303"`. |
| String `"07030"` | `"07030"` | Recognized, prefix `"070"`. |
| String `"07030-1834"` | `"07030-1834"` | Recognized, prefix `"070"`. |
| Strings `"2134"` or `"0703"` | Original string | Unrecognized; no string padding. |
| String `"M5V 2T6"` | Original string | Unrecognized; do not infer another country. |
| Absent field, null, or empty string | `""` | Missing. |
| Whitespace-only or padded strings, including a trailing newline | Original string | Unrecognized; no trimming. |
| Other malformed strings or unsuitable finite numbers | Original string or direct numeric text | Unrecognized; no additional repair. |

There is no international assessment branch. A destination whose country is not exactly `"US"`, including `"us"` and `" US "`, bypasses US assessment, with no country normalization or foreign-postal validation. Its parsed `postalAssessment` remains explicitly null. Source input preserves its raw ZIP and omission; parsed output always has a string ZIP.

## String ZIP representation in parsed output

**Assumption:** Every parsed destination has a string `zip`. Missing/null/omitted source ZIPs become `""`. Unrecognized US values and outside-US values keep their existing string or become text through direct numeric conversion, with no additional postal repair. Recognized US values use the normalized five-digit or full ZIP+4 string.

**Basis and effect:** Rafael clarified that immutability applies to source JSON and input objects, while parsed data should be normalized. He approved this complete output representation and requested revision of the implementation. Assess raw type before conversion: numeric `2134` produces recognized `"02134"`, string `"2134"` remains unrecognized `"2134"`, and outside-US numeric `2134` becomes `"2134"` with null assessment. No trimming or new recognition rule follows from converting output values to strings.

## Unrecognized postal input reaches partner fallback

**Assumption:** For a US destination, treat an unrecognized postal representation as unusable for internal routing and send the order to the partner through later routing rules.

**Basis and effect:** Rafael adopted this treatment to keep messy US postal input representable. The exercise explicitly specifies PARTNER for missing ZIPs and unmapped prefixes; applying fallback to unrecognized representations is his additional interpretation. Normalization itself does not select PARTNER. A recognized representation can still have an unmapped prefix. Outside-US eligibility is determined separately from country, without requiring a US postal assessment.

## Partial events and downstream delivery details

**Assumption:** `orders.json` contains partial events for routing rather than complete order records or physical-delivery instructions. After routing, the selected internal or partner warehouse uses `orderNumber` to retrieve the complete order and delivery details from the system that owns them, including address lines and full postal information.

**Basis and effect:** Rafael adopted this product assumption in the relayed side conversation because the supplied events omit address lines. The downstream lookup and data ownership arrangement are assumed, not verified capabilities or integrations in the supplied resources. They justify limiting this application to routing from the available event data while preserving source postal information. No lookup or shipping integration is implemented or authorized by this assumption.

## Open questions

The data investigation below supplies evidence for discussion, not accepted interpretations.

- **Remaining SKU policy:** A complete identifier grammar, any future surrounding-whitespace normalization, and treatment of identifiers absent from the catalog remain open. The current contract uppercases nonblank strings while preserving whitespace. Supplied examples do not all have three-letter product abbreviations or numeric endings (`VITD`, `MULTI`, and bundle suffix `ESS` are present). Transformation placement and the decision to omit collision refinements are settled above and in [DECISIONS.md](DECISIONS.md#sku-transformation-at-the-input-boundary).
- **Bundle stock handling:** Orders `#2040` and `#2056` request `NW-BNDL-ESS`. The catalog defines it as one `NW-VITD-60` plus one `NW-MAG-90`; warehouses stock those products and have no bundle inventory entry. How the router translates bundle quantities into stock checks and reservations has not yet been adopted.

Sources: [orders](data/orders.json), [catalog](data/catalog.json), [warehouses](data/warehouses.json), and [zones](data/zones.json).
