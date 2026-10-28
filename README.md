# Order router

A TypeScript command-line application for Part A of the [order-routing assessment](INSTRUCTIONS.md). It reads the supplied catalog, order events, warehouses, and shipping zones from `data/`, then prints one route per order.

The router reconstructs orders with eligible additions, processes them in creation order, and reserves stock between orders. It expands bundles into their component products and selects a single enabled warehouse using stock availability, lowest shipping zone, days of cover, and warehouse priority. Orders that cannot be routed internally go to `PARTNER` according to the routing rules.

## Requirements

- [Bun](https://bun.sh/) to run the application and TypeScript compiler.
- Node.js for pnpm and Vitest.
- pnpm; the version is pinned in [package.json](package.json).

Install the dependencies and run the router from the project root:

```sh
pnpm install --frozen-lockfile
pnpm start
```

Each output line contains the order number, warehouse or `PARTNER`, and a zone or fallback reason, separated by tabs. The output for the supplied datasets is in [routes.txt](routes.txt). To regenerate it without pnpm's script banner:

```sh
pnpm --silent start > routes.txt
```

## Verification

```sh
pnpm typecheck
pnpm test:all
```

`pnpm test:unit` runs the tests beside the source modules; `pnpm test:integration` runs the cross-layer and CLI tests. The [development guide](docs/development.md) describes the test layout and independently calculated expected output.

## Project notes

- [Architecture](docs/ARCHITECTURE.md) and [routing rules](docs/routing.md) describe the code and data flow.
- [Assumptions](ASSUMPTIONS.md) records interpretations of unspecified behavior, including SKU, ZIP, and bundle handling.
- [Decisions](DECISIONS.md) explains the engineering choices and their rationale.
- [Journal](JOURNAL.md) records project progress and AI collaboration. The [Codex session transcript](agent-codex-transcription.md) is a historical export whose coverage is specified in its header.

Unknown order SKUs, nested bundles, and unsupported component references cause an error; see the [routing guide](docs/routing.md#unsupported-cases) for the full list of unsupported inputs.

## Part B — Questions and answers

For these answers, I use the Part A output together with the supplied [operations notes](raicom-files/ops-notes.md). The router follows the supplied warehouse configuration; the notes describe an operational constraint that the configuration does not yet reflect. I treat “today” and “Monday” as part of the assessment scenario.

### 1. Where should each order actually ship from today?

I would keep Georgia eligible for this question: its warehouse is shipping, although picking is approximately two business days behind. Nevada is unable to ship because of water damage, even though the router configuration still enables it.

| Order | My answer | Why |
|---|---|---|
| #2033 | WH-NJ | The numeric ZIP becomes `02134` under my ZIP assumption. NJ is the closest eligible warehouse, at zone 3. |
| #2037 | Partner warehouse | The destination is in Canada, so the international rule applies first. |
| #2040 | WH-GA | The bundle needs vitamin D and magnesium. Earlier orders have exhausted NJ's magnesium; GA can supply both at zone 5. |
| #2041 | WH-GA | The multivitamin added 18 minutes after creation belongs in the order. GA can supply both products at zone 7; NV has no multivitamin and NJ is zone 8. |
| #2045 | WH-GA | I match the lowercase magnesium SKU case-insensitively. NJ has no magnesium remaining, and GA is zone 3. |
| #2050 | WH-NJ | The order needs two vitamin D units. GA has only one available at that point; NJ can fulfill it at zone 5. |
| #2051 | Hold for a person to decide | The router assigns NV at zone 2, but NV cannot ship. I would hold the order and check current uncommitted inventory before reassigning it. |

For #2051, I would not assume a replacement warehouse's stock is still available. Replaying the full sequence with NV unavailable could change earlier assignments and later reservations. In the Part A run, GA's remaining vitamin D is subsequently reserved by #2056, so I would avoid promising that unit to both orders.

### 2. Should the router stop sending orders to WH-GA until Monday?

**My choice: route away from WH-GA only when another warehouse is within one zone of it.** I would keep NV unavailable and divert only to a warehouse that is operational, enabled, and has enough unreserved stock for the complete order.

The finance estimates suggest that, for about 70% of GA's 420 daily orders, an alternative adds roughly two days in transit and $2.35 per parcel. For the other 30%, it adds roughly half a day and $0.40 per parcel. Using those proportions, diverting the latter group would add approximately **$50.40 per day**, compared with approximately **$741.30 per day** for diverting all 420 orders.

I would use selective diversion because it targets orders with a better chance of arriving sooner without imposing the larger cost on every GA shipment. These are directional estimates: the picking delay is stated in business days, transit times are approximate, and the alternatives must have enough capacity. I would monitor delivery times, costs, and receiving-warehouse backlog, then review GA's recovery with Operations on Monday.
