# Application integration scenario

This synthetic scenario is the first Part A completion signal, not an oracle for the supplied assessment dataset. `fixtures.ts` contains the four raw datasets as TypeScript objects checked against source input types. These preserve the original handwritten scenario. `expected.txt` was established by the arithmetic below before implementing repositories or routing and remains unchanged. Never regenerate it from the router's output.

The test calls the real argument-free `routeOrders()` and mocks only the four dataset loader functions, each returning fresh copies. Repositories, schemas, domain rules, coordinator, reservation, and output formatting are real. Captured stdout must match one tab-separated line per order: number, warehouse or `PARTNER`, then `zone=N` or fallback reason. The test does not write the project's `routes.txt` or use production datasets.

Use `pnpm test tests/route-orders.integration.test.ts`. This replaced the original CLI subprocess test after Rafael chose simpler raw TypeScript fixtures. During implementation it advanced through intentional unimplemented operations until the entire scenario passed. It also checks repeated runs and unchanged raw fixtures. Passing establishes the documented scenario; it does not establish all of Part A's behavior.

## Independent expected results

Call Vitamin D **D** and magnesium **M** below. Initial available stock is NJ `(6 D, 4 M)`, GA `(8 D, 5 M)`, and NV `(2 D, 8 M)`. D velocities are respectively `2`, `1`, `1`; M velocity is `1` everywhere. TX has ample stock and favorable zones but is disabled, so it must never win. Order cover is computed from stock before reservation.

| Order | Manual reasoning | Expected result |
|---|---|---|
| #A1 | NJ/GA tie at zone 2. D cover is NJ `6/2=3`, GA `8/1=8`; GA wins, leaving 7 D. NV has more distant zone 4. | GA, zone 2 |
| #A2 | NV has lowest enabled zone 1 and 2 D; reserve 1 D, leaving 1. | NV, zone 1 |
| #A3 | Needs 7 D; GA has exactly 7 and reserves all. NJ has 6, NV 1. | GA, zone 1 |
| #A4 | Needs 2 D; only NJ has enough. Reserve 2, leaving 4 D. | NJ, zone 2 |
| #A5 | Needs 5 D. NJ has 4 and NV 1; combined stock cannot justify splitting an order. No stock is reserved. | PARTNER, insufficient-stock |
| #A6 | Creation requests 1 M. Add 2 D from the edit at +18 minutes; exclude the 100 D edit at +35 minutes. NV lacks 2 D; GA has none. NJ can supply both, leaving `(2 D, 3 M)`. | NJ, zone 4 |
| #A7 | Needs 3 D; NJ now has 2, NV 1, GA 0. This detects reservation of #A6's edited demand before the next order. | PARTNER, insufficient-stock |
| #A8 | NJ/GA tie at zone 2; M cover `3/1` versus `5/1` favors GA, leaving 4 M. | GA, zone 2 |
| #A9 | Same zone tie; M cover `3` versus `4` favors GA, leaving 3 M. | GA, zone 2 |
| #A10 | Same zone and cover tie (`3` each). NJ wins the required priority, leaving 2 M. | NJ, zone 2 |
| #A11 | Canadian destination bypasses US assessment and internal routing. | PARTNER, outside-us |
| #A12 | Empty ZIP is missing under the accepted postal policy. | PARTNER, missing-zip |
| #A13 | String `"2134"` is unrecognized; do not apply numeric repair. | PARTNER, unrecognized-zip |
| #A14 | Recognized `"96815"` has prefix `968`, absent from all zone maps. | PARTNER, unmapped-prefix |
| #A15 | Numeric `2134` becomes `"02134"`, prefix `021`; lowercase SKU becomes uppercase. NJ has lowest zone and reserves 1 D, leaving 1. | NJ, zone 1 |
| #A16 | Full ZIP+4 uses prefix `070`. NJ/GA tie at zone 2; M cover `2` versus `3` favors GA, leaving 2 M. | GA, zone 2 |

The raw event array intentionally starts with #A3 before #A1 and #A2. Correct output uses creation timestamps, not arrival order or lexical order numbers, and contains exactly 16 lines despite 18 events. #A6 is routed once with its eligible addition, even though the edit arrives after later orders' creations. Partner fallbacks reserve no internal stock.

## Remaining coverage and open policies

The original 16-order fixture uses standalone products, positive velocities, distinct creation timestamps, and clearly inside/outside-window edits. Bundle handling is now [adopted](../../../ASSUMPTIONS.md#bundle-stock-from-standalone-components) and covered by additional application scenarios. Unknown identifiers and SKU grammar remain [open](../../../ASSUMPTIONS.md#open-questions).

Adjacent focused tests additionally cover empty-list ranking, multi-product minimum cover, zero velocity, aggregation of repeated product lines, full warehouse-priority ordering, timestamp/window boundaries, and input immutability. Those are not all proven by this scenario alone.

Mocked loaders bypass real file access, JSON text parsing/guards, and loader caching. Existing loader tests cover those behaviors separately. `assessment.integration.test.ts` and `router.cli.test.ts` now cover real supplied files and CLI execution against the separate [supplied-data oracle](../assessment/README.md). This original fixture and its expected output remain unchanged.
