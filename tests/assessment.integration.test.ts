import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { routeOrders } from "../src/application/route-orders";
import * as routing from "../src/domain/routing";
import { loadCatalog, loadOrders, loadWarehouses, loadZones } from "../src/lib/loader/Loader";

afterEach(() => vi.restoreAllMocks());

it("routes the real datasets to the independently calculated final stock without altering cached inputs", async () => {
  const before = await Promise.all([loadCatalog(), loadOrders(), loadWarehouses(), loadZones()]);
  const initialize = vi.spyOn(routing, "prepareRoutingRun");
  const output = vi.spyOn(process.stdout, "write").mockImplementation((_chunk, encodingOrCallback, callback) => {
    const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    complete?.();
    return true;
  });
  const routes = await routeOrders();
  const context = await initialize.mock.results[0]!.value;

  expect(routes).toHaveLength(26);
  expect(output).toHaveBeenCalledExactlyOnceWith(
    readFileSync(new URL("./fixtures/assessment/expected.txt", import.meta.url), "utf8"),
    expect.any(Function),
  );
  expect(context.warehouses).toMatchObject([
    { code: "WH-NJ", inventory: {
      "NW-VITD-60": { available: 395 }, "NW-MULTI-30": { available: 119 }, "NW-MAG-90": { available: 0 },
    } },
    { code: "WH-GA", inventory: {
      "NW-VITD-60": { available: 0 }, "NW-MULTI-30": { available: 293 }, "NW-MAG-90": { available: 144 },
    } },
    { code: "WH-NV", inventory: {
      "NW-VITD-60": { available: 198 }, "NW-MULTI-30": { available: 0 }, "NW-MAG-90": { available: 216 },
    } },
    { code: "WH-TX", inventory: {
      "NW-VITD-60": { available: 500 }, "NW-MULTI-30": { available: 500 }, "NW-MAG-90": { available: 500 },
    } },
  ]);
  expect(await Promise.all([loadCatalog(), loadOrders(), loadWarehouses(), loadZones()])).toEqual(before);
});
