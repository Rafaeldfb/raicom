# Development and testing

Toolchain, commands, test layout, and the checks to run before finishing a change. Read before running or adding tests, regenerating `routes.txt`, or changing scripts and dependencies.

## Toolchain

| Tool | Role |
|---|---|
| Bun | Runs the application (`pnpm start`) and the TypeScript compiler (`pnpm typecheck`). |
| Node | Runs pnpm and Vitest. Must be on `PATH`. |
| pnpm | Package manager, pinned through `packageManager` in [package.json](../package.json). |
| TypeScript 6 | No-emit typechecking with Bun type definitions. |
| Zod | The only runtime dependency; used for input contracts. |
| Vitest | Test runner. |

Exact versions are in [package.json](../package.json) and [pnpm-lock.yaml](../pnpm-lock.yaml). Use the pnpm test scripts; `bun test` invokes Bun's own runner, which this project does not use, and Vitest runs under Node because it times out under Bun. The rationale for this toolchain is in [DECISIONS.md](../DECISIONS.md#runtime-and-development-tools).

## Commands

| Command | Purpose |
|---|---|
| `pnpm install --frozen-lockfile` | Install the locked dependency versions. |
| `pnpm start` | Route the supplied datasets and print one line per order. |
| `pnpm --silent start > routes.txt` | Regenerate `routes.txt` without pnpm's script banner. |
| `pnpm typecheck` | Typecheck the whole project. |
| `pnpm test` | Run every unit, integration, and CLI test. |
| `pnpm test:unit` | Run only the colocated unit suites in `src/`. |
| `pnpm test:integration` | Run only the integration and CLI suites in `tests/`. |
| `pnpm test:all` | Run unit suites first, then integration/CLI suites. Stop if the unit command fails. |
| `pnpm test src/schemas src/lib/loader src/normalization` | Run only the ingestion-boundary tests. |
| `pnpm test tests` | Filter the original test command to the same suites as `test:integration`. |

## Test layout

| Level | Location | What it proves |
|---|---|---|
| Unit | `*.test.ts` next to each module in `src/` | One contract, helper, repository, domain rule, or the coordinator's sequencing. |
| Dataset-loader integration | [loader.integration.test.ts](../tests/loader.integration.test.ts) | Real dataset paths, guarded loading, schema composition and transformations, and raw-cache preservation. |
| Synthetic integration | [route-orders.integration.test.ts](../tests/route-orders.integration.test.ts), [bundle-routing.integration.test.ts](../tests/bundle-routing.integration.test.ts) | Real repositories, schemas, domain, coordinator, and formatting, with only the four loaders mocked to return raw TypeScript fixtures. |
| Supplied data | [assessment.integration.test.ts](../tests/assessment.integration.test.ts) | The real files produce the expected 26 routes and final stock, and the loader cache is unchanged. |
| CLI | [router.cli.test.ts](../tests/router.cli.test.ts) | `pnpm --silent start` prints exactly the expected output with empty stderr; a closed stdout pipe is reported, not left unhandled. |

Synthetic tests mock at the loader boundary, so they exercise schema transformations but not guarded file parsing; dataset-loader integration covers real files and schema composition separately. Keep unit tests next to the code they test, and put tests that cross several layers, including CLI subprocess tests, in `tests/`. The unit and integration commands partition those directories; `test:all` invokes each group once in order. `pnpm test` keeps Vitest's normal scheduling across the complete suite.

## Expected outputs are independent

Each expected output is calculated by hand from the inputs and the routing rules, with the reasoning recorded beside it:

- [cli-routing](../tests/fixtures/cli-routing/README.md): the synthetic scenario, with fixtures in `fixtures.ts`.
- [assessment](../tests/fixtures/assessment/README.md): the supplied datasets, with a per-order stock ledger.

Never regenerate an expected file from application output or from `routes.txt`. When a rule change alters expected results, recalculate them by hand and update the ledger first, then change the code until tests pass.

`routes.txt` is the submitted output for the supplied data. It is produced only by the command above and must match [tests/fixtures/assessment/expected.txt](../tests/fixtures/assessment/expected.txt) byte for byte. Do not edit it by hand.

## Before finishing a change

1. Run `pnpm typecheck` and `pnpm test:all`.
2. If routing or output changed, check that `pnpm --silent start` still matches `routes.txt`, for example with `pnpm --silent start | diff - routes.txt`.
3. Update the guide that owns any behavior or convention you changed, following the [guide rules](../.agents/skills/maintain-project-records/SKILL.md#guides).
