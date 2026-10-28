import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { routeOrders } from "../src/application/route-orders";
import { loadCatalog, loadOrders, loadWarehouses, loadZones } from "../src/lib/loader/Loader";
import { rawCatalog, rawOrders, rawWarehouses, rawZones } from "./fixtures/cli-routing/fixtures";

vi.mock("../src/lib/loader/Loader", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lib/loader/Loader")>();
  const fixtures = await import("./fixtures/cli-routing/fixtures");
  return {
    ...original,
    loadCatalog: vi.fn(async () => structuredClone(fixtures.rawCatalog)),
    loadOrders: vi.fn(async () => structuredClone(fixtures.rawOrders)),
    loadWarehouses: vi.fn(async () => structuredClone(fixtures.rawWarehouses)),
    loadZones: vi.fn(async () => structuredClone(fixtures.rawZones)),
  };
});

afterEach(() => vi.restoreAllMocks());
beforeEach(() => vi.clearAllMocks());

it("routes reconstructed orders in creation order with sequential reservations", async () => {
  const expected = readFileSync(new URL("./fixtures/cli-routing/expected.txt", import.meta.url), "utf8");
  const output: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk, encodingOrCallback, callback) => {
    output.push(String(chunk));
    const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    complete?.();
    return true;
  });

  const routes = await routeOrders();
  expect(output.join("")).toBe(expected);
  expect(routes.map((route) => route.orderNumber)).toEqual(
    expected.trimEnd().split("\n").map((line) => line.split("\t")[0]),
  );
});

it("starts repeated runs with fresh stock and leaves raw fixtures unchanged", async () => {
  const expected = readFileSync(new URL("./fixtures/cli-routing/expected.txt", import.meta.url), "utf8");
  const before = structuredClone({ rawCatalog, rawOrders, rawWarehouses, rawZones });
  const output: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk, encodingOrCallback, callback) => {
    output.push(String(chunk));
    const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    complete?.();
    return true;
  });
  const first = await routeOrders();
  const second = await routeOrders();
  expect(output).toEqual([expected, expected]);
  expect(second).toEqual(first);
  expect(second).not.toBe(first);
  expect({ rawCatalog, rawOrders, rawWarehouses, rawZones }).toEqual(before);
  for (const load of [loadCatalog, loadOrders, loadWarehouses, loadZones]) {
    expect(load).toHaveBeenCalledTimes(2);
  }
});

it("expands a bundle through the real domain pipeline and compares component cover", async () => {
  const order = rawOrders.find((event) => event.type === "order_created" && event.orderNumber === "#A1")!;
  vi.mocked(loadOrders).mockResolvedValueOnce([{
    ...order, lines: [{ sku: "NW-BNDL-ESS", quantity: 1 }],
  }]);
  vi.mocked(loadCatalog).mockResolvedValueOnce({
    ...rawCatalog,
    bundles: [{ sku: "NW-BNDL-ESS", name: "Bundle", priceCents: 100,
      components: [{ sku: "NW-VITD-60", quantity: 1 }, { sku: "NW-MAG-90", quantity: 1 }] }],
  });
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation((_chunk, encodingOrCallback, callback) => {
    const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    complete?.();
    return true;
  });
  expect(await routeOrders()).toEqual([{ orderNumber: "#A1", kind: "warehouse", warehouseCode: "WH-GA", zone: 2 }]);
  // NJ/GA tie at zone 2; their minimum component cover is 3 versus 5.
  expect(stdout).toHaveBeenCalledExactlyOnceWith("#A1\tWH-GA\tzone=2\n", expect.any(Function));
});

it("keeps unknown-SKU policy unsupported without publishing partial output", async () => {
  const order = rawOrders.find((event) => event.type === "order_created" && event.orderNumber === "#A1")!;
  vi.mocked(loadOrders).mockResolvedValueOnce([{ ...order, lines: [{ sku: "NW-UNKNOWN", quantity: 1 }] }]);
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  await expect(routeOrders()).rejects.toThrow("resolveOrderProducts: unknown SKU handling not implemented");
  expect(stdout).not.toHaveBeenCalled();
});

it("reserves scarce stock for the earlier creation even when both timestamps share a millisecond", async () => {
  const order = rawOrders.find((event) => event.type === "order_created" && event.orderNumber === "#A1")!;
  vi.mocked(loadOrders).mockResolvedValueOnce([
    { ...order, orderNumber: "#later", at: "2026-10-20T13:00:00.000900Z" },
    { ...order, orderNumber: "#earlier", at: "2026-10-20T13:00:00.000100Z" },
  ]);
  vi.mocked(loadWarehouses).mockResolvedValueOnce(rawWarehouses.map((warehouse) => ({
    ...warehouse,
    inventory: { "NW-VITD-60": { available: warehouse.code === "WH-NJ" ? 1 : 0, dailyVelocity: 1 } },
  })));
  const output: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk, encodingOrCallback, callback) => {
    output.push(String(chunk));
    const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    complete?.();
    return true;
  });
  await routeOrders();
  expect(output.join("")).toBe("#earlier\tWH-NJ\tzone=2\n#later\tPARTNER\tinsufficient-stock\n");
});
