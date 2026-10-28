# Input contracts

What each supplied dataset must look like to pass ingestion, and what the parsed output looks like. Read before changing a schema, relying on a parsed field, or deciding whether an input case is accepted. For how to write and compose contracts, see [schema patterns](schemas.md); for observations about the supplied files, see [data research](data-research.md).

Every contract follows [bounded input permissiveness](../DECISIONS.md#bounded-input-permissiveness): accept the representations that are meaningful for that field, reject arbitrary types and implausible values, and never coerce broadly. Contracts check the shape and values of one record; cross-file relationships (catalog membership, warehouse codes in zones, unique order numbers) belong to the domain.

## Shared values

| Value | Schema | Accepted input | Output |
|---|---|---|---|
| SKU | `SkuSchema` in [sku.schema.ts](../src/schemas/sku.schema.ts) | Nonblank string | Uppercased branded `Sku`; whitespace preserved. No identifier grammar. |
| Raw ZIP | `RawZipSchema` in [zip.schema.ts](../src/schemas/zip.schema.ts) | String, finite number, `null`, or omitted | Unchanged; recognition happens in the destination transform. |
| ZIP prefix | `ZipPrefixSchema` | Exactly three ASCII digits | Branded `ZipPrefix`; shared by zone-map keys and postal assessment. |
| Warehouse code | `WarehouseCodeSchema` in [warehouse.schema.ts](../src/schemas/warehouse.schema.ts) | Nonblank string | Unchanged; no whitelist of the four current codes. |

## Catalog

[catalog.schema.ts](../src/schemas/catalog.schema.ts) exports `CatalogSchema` and its record schemas. All objects are strict: unknown fields are rejected at every level.

| Location | Contract |
|---|---|
| Root | `products` and `bundles` arrays, both required; either may be empty. |
| Product | `sku`, `name`, `priceCents`, all required. |
| Bundle | Product fields plus `components`, with at least one component. |
| Component | `sku` and `quantity`, both required. |
| `name` | Nonblank string; original text retained. |
| `priceCents` | Integer number, zero or greater. |
| `quantity` | Positive integer number; `1` is valid. |

Numeric strings, fractions, negatives, `null`, and booleans are rejected for prices and quantities. The contract does not check SKU uniqueness or that components reference products; `resolveOrderProducts` in the domain enforces component references (see [routing](routing.md#product-demand-and-bundles)).

## Warehouses

[warehouse.schema.ts](../src/schemas/warehouse.schema.ts) exports `WarehouseSchema` for one record and `WarehousesSchema` for the dataset array.

| Location | Contract |
|---|---|
| Root | Array of warehouses; may be empty. |
| Warehouse | Strict object with `code`, `city`, `enabled`, and `inventory`. |
| `city` | Nonblank string, preserved. |
| `enabled` | Boolean; `false` is preserved. No string or numeric coercion. |
| `inventory` | Record keyed by `SkuSchema`; may be empty. |
| Inventory entry | Strict object with `available` and `dailyVelocity`. |
| `available` | Nonnegative integer number. |
| `dailyVelocity` | Nonnegative finite number; zero and fractions are valid because it is a rate. |

Inventory keys are uppercased without collision checks, under the [no-collision assumption](../ASSUMPTIONS.md#no-distinct-sku-collisions-after-normalization). The contract does not check catalog membership or unique warehouse codes.

## Zones

[zones.schema.ts](../src/schemas/zones.schema.ts) exports `ZonesSchema`, `WarehouseZonesSchema`, and `ZoneSchema`. It re-exports `ZipPrefixSchema` for compatibility.

| Location | Contract |
|---|---|
| Root | Required string `_note`, plus any number of warehouse-map entries. |
| Warehouse key | Nonblank string. `_note` is the only metadata key; any other string-valued entry is rejected. |
| Warehouse map | Record from ZIP prefix to zone; may be empty. |
| Zone | Integer number from 1 through 8. No string coercion. |

The parsed output keeps the source layout, so its value type includes the `_note` string. Consumers must skip `_note` and string values before reading a warehouse map. Prefix keys are exact three-digit strings with no padding, trimming, or extraction from a full ZIP.

## Order events

[order.schema.ts](../src/schemas/order.schema.ts) models `orders.json` as events, not orders. `OrderEventSchema` is a discriminated union on `type`; `OrderEventsSchema` is the dataset array, which may be empty. Every object is strict, so unknown fields and hybrids of the two event shapes are rejected.

| Event `type` | Required fields |
|---|---|
| `order_created` | `orderNumber`, `at`, `shipTo`, and a nonempty `lines` array. |
| `order_edited` | `orderNumber`, `at`, and a nonempty `addedLines` array. |

| Field | Contract |
|---|---|
| `orderNumber` | Nonblank string; no number grammar. |
| `at` | ISO datetime string with `Z` or an offset, kept as a string with all fractional digits. |
| Line | Strict object with `sku` (`SkuSchema`) and `quantity` (positive integer number). |
| `shipTo.country`, `shipTo.state` | Nonblank strings, preserved; no case normalization or whitelist. |
| Input `shipTo.zip` | Raw ZIP: string, finite number, `null`, or omitted. |
| Output `shipTo.zip` | Always a string. |
| Output `shipTo.postalAssessment` | `{ kind: "recognized", prefix }`, `{ kind: "missing" }`, or `{ kind: "unrecognized" }` when `country` is exactly `"US"`; otherwise `null`. Source records that already contain this field are rejected. |

The destination transform and its ZIP rules are described in [country-aware postal assessment](schemas.md#country-aware-postal-assessment). For example, US source `zip: 2134` parses to `zip: "02134"` with prefix `"021"`, while string `"2134"` stays `"2134"` and is unrecognized.

Parsing does not combine events into orders, sort them, check that edits match a creation, or enforce the edit window. Those rules live in [routing](routing.md#order-reconstruction).
