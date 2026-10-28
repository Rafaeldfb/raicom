import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeOrders } from "../src/application/route-orders";
import { loadCatalog, loadOrders, loadWarehouses, loadZones } from "../src/lib/loader/Loader";
import type { OrderCreatedEventInput, OrderLineInput } from "../src/schemas/order.schema";
import type { WarehouseInput } from "../src/schemas/warehouse.schema";
import { rawCatalog } from "./fixtures/cli-routing/fixtures";

vi.mock("../src/lib/loader/Loader", () => ({
  loadCatalog: vi.fn(), loadOrders: vi.fn(), loadWarehouses: vi.fn(), loadZones: vi.fn(),
}));

const line = (sku: string, quantity = 1): OrderLineInput => ({ sku, quantity });
const creation = (orderNumber: string, minute: number, zip: string, lines: OrderLineInput[]): OrderCreatedEventInput => ({
  type: "order_created", orderNumber, at: `2026-10-20T13:${String(minute).padStart(2, "0")}:00Z`,
  shipTo: { country: "US", state: "NJ", zip }, lines,
});
const warehouse = (code: string, vitamin: number, magnesium: number, enabled = true): WarehouseInput => ({
  code, city: "Test city", enabled,
  inventory: {
    "NW-VITD-60": { available: vitamin, dailyVelocity: 1 },
    "NW-MAG-90": { available: magnesium, dailyVelocity: 1 },
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loadCatalog).mockResolvedValue({
    ...structuredClone(rawCatalog),
    bundles: [{ sku: "NW-BNDL-ESS", name: "Bundle", priceCents: 100,
      components: [{ sku: "NW-VITD-60", quantity: 1 }, { sku: "NW-MAG-90", quantity: 1 }] }],
  });
});
afterEach(() => vi.restoreAllMocks());

describe("bundle routing through real repositories and domain operations", () => {
  it("preserves lowest-zone precedence, aggregates edits, and reserves components sequentially without splitting", async () => {
    vi.mocked(loadWarehouses).mockResolvedValue([
      warehouse("WH-NJ", 3, 1), warehouse("WH-GA", 10, 10),
      warehouse("WH-NV", 2, 2), warehouse("WH-TX", 100, 100, false),
    ]);
    vi.mocked(loadZones).mockResolvedValue({
      _note: "test", "WH-NJ": { "070": 1, "303": 3 }, "WH-GA": { "070": 2, "303": 1 },
      "WH-NV": { "070": 3, "303": 2 }, "WH-TX": { "070": 1, "303": 1 },
    });
    vi.mocked(loadOrders).mockResolvedValue([
      creation("#B1", 0, "07030", [line("NW-BNDL-ESS")]),
      creation("#B2", 1, "07030", [line("NW-BNDL-ESS"), line("NW-VITD-60")]),
      creation("#B3", 2, "30303", [line("NW-VITD-60", 8)]),
      creation("#B4", 3, "07030", [line("NW-BNDL-ESS")]),
      creation("#B5", 4, "07030", [line("NW-BNDL-ESS", 8)]),
      { type: "order_edited", orderNumber: "#B2", at: "2026-10-20T13:19:00Z", addedLines: [line("nw-bndl-ess")] },
    ]);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation((_chunk, encodingOrCallback, callback) => {
      const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
      complete?.();
      return true;
    });
    await routeOrders();
    // B1 picks NJ zone 1 despite GA cover 10 > NJ cover 1. NJ then has no M.
    // B2 needs D3/M2 with its edit; only GA qualifies, leaving D7/M8.
    // B3 cannot take D8; B4 leaves GA D6/M7. B5 cannot combine remaining warehouses.
    expect(stdout).toHaveBeenCalledExactlyOnceWith(
      "#B1\tWH-NJ\tzone=1\n#B2\tWH-GA\tzone=2\n#B3\tPARTNER\tinsufficient-stock\n#B4\tWH-GA\tzone=2\n#B5\tPARTNER\tinsufficient-stock\n",
      expect.any(Function),
    );
  });

  it("uses minimum component cover after zone ties, then priority after cover ties", async () => {
    vi.mocked(loadWarehouses).mockResolvedValue([
      warehouse("WH-NJ", 100, 2), warehouse("WH-GA", 6, 6),
      warehouse("WH-NV", 0, 0), warehouse("WH-TX", 100, 100, false),
    ]);
    vi.mocked(loadZones).mockResolvedValue({
      _note: "test", "WH-NJ": { "070": 2 }, "WH-GA": { "070": 2 },
      "WH-NV": { "070": 3 }, "WH-TX": { "070": 1 },
    });
    vi.mocked(loadOrders).mockResolvedValue(
      [1, 2, 3, 4, 5].map((number) => creation(`#C${number}`, number, "07030", [line("NW-BNDL-ESS")])),
    );
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation((_chunk, encodingOrCallback, callback) => {
      const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
      complete?.();
      return true;
    });
    await routeOrders();
    // NJ cover stays min(100,2)=2. GA cover falls from 6 to 2 after four bundles.
    // The fifth order ties on zone and cover, so NJ wins priority.
    expect(stdout).toHaveBeenCalledExactlyOnceWith(
      "#C1\tWH-GA\tzone=2\n#C2\tWH-GA\tzone=2\n#C3\tWH-GA\tzone=2\n#C4\tWH-GA\tzone=2\n#C5\tWH-NJ\tzone=2\n",
      expect.any(Function),
    );
  });
});
