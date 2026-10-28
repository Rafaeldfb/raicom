# Routing domain

How parsed input becomes one route per order: order reconstruction, product demand, the seven Part A rules, reservation, and output. Read before changing a routing rule, the coordinator, or the output format. The rules themselves come from [Part A of the instructions](../INSTRUCTIONS.md#part-a-order-router-about-40-minutes); interpretations of unspecified behavior are in [ASSUMPTIONS.md](../ASSUMPTIONS.md).

## Sequence

[`routeOrders()`](../src/application/route-orders.ts) runs these steps in order. Each rule is a named domain function, and the coordinator keeps the rule numbers visible as comments.

| Step | Function | Outcome |
|---|---|---|
| Load | `prepareRoutingRun` | Fresh `RoutingContext` with parsed events, catalog, zones, and warehouses. |
| Reconstruct | `reconstructCompleteOrders` | One `Order` per creation, with eligible edit lines appended. |
| Order | `sortOrdersByCreation` | Orders by creation instant. |
| Rule 1 | `isUsDestination` | Not exactly `"US"`: PARTNER `outside-us`. |
| Rule 2 | `checkPostalCoverage` | Missing, unrecognized, or unmapped ZIP: PARTNER with that reason. |
| Demand | `resolveOrderProducts` | Aggregated standalone-product quantities, with bundles expanded. |
| Rule 3 | `findEligibleWarehouses` | Enabled warehouses with enough stock for every product. |
| Rule 4 | `retainLowestZone` | Eligible warehouses at the lowest zone for the prefix. |
| Rule 5 | `retainHighestOrderCover` | Candidates with the greatest order cover. |
| Rule 6 | `applyWarehousePriority` | One candidate by WH-NJ, WH-GA, WH-NV, WH-TX, or `undefined`. |
| Rule 7 | Coordinator | `undefined`: PARTNER `insufficient-stock`. |
| Reserve | `reserveStock` | New inventory state used by the next order. |
| Publish | `publishRoutes` | All results written to stdout once every order is routed. |

Rules return early per order: an order that leaves at rule 1 or 2 never resolves demand or reserves stock. Do not reorder these steps; rule 1 precedes postal checks, and lowest zone precedes cover.

## Order reconstruction

[`domain/order.ts`](../src/domain/order.ts) builds complete orders from events in two passes, so edits match their creation regardless of arrival order:

1. Each `order_created` event becomes an `Order` with copied destination and lines.
2. Each `order_edited` event appends its `addedLines` when its instant is between the creation instant and 30 minutes later, both inclusive. Edits outside that window are ignored.

`sortOrdersByCreation` returns a new sorted array. Orders with identical creation instants keep their event order.

Timestamps keep every fractional digit the schema accepts. Comparisons use timezone-adjusted whole seconds from `Date.parse` on the timestamp without its fraction, then compare the fractional digits as zero-padded strings. Do not compare full timestamps with `Date.parse` alone, because it truncates to milliseconds, and do not narrow the schema's precision to simplify comparison.

## Product demand and bundles

[`resolveOrderProducts`](../src/domain/catalog.ts) turns order lines into the demand that every later rule uses:

- A bundle line contributes each component's quantity multiplied by the bundle quantity.
- Quantities for the same SKU are summed across direct lines, bundle components, and eligible edit lines.
- Original order lines are not changed.

For example, two `NW-BNDL-ESS` plus one `NW-VITD-60` become three `NW-VITD-60` and two `NW-MAG-90`. Eligibility, cover, and reservation all consume this same aggregated demand, never the raw lines. Bundles have no stock or velocity of their own; see the [bundle assumption](../ASSUMPTIONS.md#bundle-stock-from-standalone-components) and [decision](../DECISIONS.md#component-based-bundle-fulfillment).

Components must reference standalone catalog products. Expansion is one level deep and never follows a bundle reference.

## Country and postal checks

`isUsDestination` compares `shipTo.country` with exactly `"US"`; values such as `"us"` go to PARTNER `outside-us`.

`checkPostalCoverage` reads the `postalAssessment` produced at ingestion and never reinterprets `shipTo.zip`:

| Assessment | Result |
|---|---|
| `missing` | PARTNER `missing-zip` |
| `unrecognized` | PARTNER `unrecognized-zip`, under the [fallback assumption](../ASSUMPTIONS.md#unrecognized-postal-input-reaches-partner-fallback) |
| `recognized`, prefix absent from every warehouse map | PARTNER `unmapped-prefix` |
| `recognized`, prefix present in any warehouse map | Covered; selection continues with that prefix |

## Selection

- **Eligibility:** a warehouse must be enabled and have `available` at least equal to the demand for every product. A product missing from its inventory counts as zero stock. Orders are never split.
- **Lowest zone:** only eligible warehouses with a zone for the prefix are kept, and then only those at the minimum zone. If no eligible warehouse has a zone for the prefix, the list is empty and the order reaches rule 7.
- **Cover:** for each candidate, cover is the minimum `available / dailyVelocity` over the order's products, using stock before this order's reservation. Positive stock with zero velocity gives infinite cover. Candidates whose cover equals the maximum are kept, so infinite covers tie.
- **Priority:** a single candidate is returned directly; ties resolve in the order WH-NJ, WH-GA, WH-NV, WH-TX; an empty list returns `undefined`.

Each step must preserve an empty list so the coordinator can apply rule 7. Never default to a warehouse.

## Reservation

`reserveStock` checks that the selected warehouse is enabled and can fulfill every product, then returns a deep copy of the warehouses with the demand subtracted. The coordinator replaces `context.warehouses` with that copy before the next order, so later orders see reduced stock. PARTNER results reserve nothing.

The context is created per run and holds no state between runs. Do not introduce module-level inventory.

## Output

Routing produces `RoutingResult` values; formatting happens only in [`writeRoutes`](../src/repositories/routes.repository.ts). Each result becomes one tab-separated line:

```text
#2031	WH-NJ	zone=1
#2037	PARTNER	outside-us
```

PARTNER reasons are `outside-us`, `missing-zip`, `unrecognized-zip`, `unmapped-prefix`, and `insufficient-stock`. An empty result list prints nothing.

All lines are written in one call, and publication waits for the write callback. A callback error or stream `error` event rejects through the application to the CLI, which prints the message to stderr and exits with code 1. After a callback error, the temporary `error` listener stays attached until the current event-loop turn ends, because Node can emit the event after the callback while Bun reports the failure only through the callback. Cleanup removes only that listener.

## Unsupported cases

These cases abort the whole run with an error before any route is printed. They are absent from the supplied data. Do not replace them with an invented policy; behavior for them belongs in [ASSUMPTIONS.md](../ASSUMPTIONS.md#open-questions) first.

| Case | Where it fails |
|---|---|
| Order line SKU absent from the catalog | `resolveOrderProducts` (`unknown SKU handling not implemented`) |
| Bundle component that is another bundle or not in the catalog | `resolveOrderProducts` (`Unsupported bundle component`) |
| Two creation events for one order number | `reconstructCompleteOrders` |
| Edit event without a matching creation | `reconstructCompleteOrders` |
| Priority tie involving a warehouse outside the four listed codes | `applyWarehousePriority` |
