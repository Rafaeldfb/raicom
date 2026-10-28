import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveOrderProducts } from "../domain/catalog";
import { reconstructCompleteOrders, sortOrdersByCreation, type Order } from "../domain/order";
import * as routing from "../domain/routing";
import { reserveStock } from "../domain/warehouse";
import { CatalogSchema } from "../schemas/catalog.schema";
import { OrderLineSchema, ShipToSchema } from "../schemas/order.schema";
import { WarehousesSchema } from "../schemas/warehouse.schema";
import { ZipPrefixSchema } from "../schemas/zip.schema";
import { ZonesSchema } from "../schemas/zones.schema";
import { routeOrders } from "./route-orders";

vi.mock("../domain/catalog", () => ({ resolveOrderProducts: vi.fn() }));
vi.mock("../domain/order", () => ({ reconstructCompleteOrders: vi.fn(), sortOrdersByCreation: vi.fn() }));
vi.mock("../domain/warehouse", () => ({ reserveStock: vi.fn() }));
vi.mock("../domain/routing", () => ({
  prepareRoutingRun: vi.fn(), publishRoutes: vi.fn(), isUsDestination: vi.fn(),
  checkPostalCoverage: vi.fn(), findEligibleWarehouses: vi.fn(),
  retainLowestZone: vi.fn(), retainHighestOrderCover: vi.fn(), applyWarehousePriority: vi.fn(),
}));

const products = [OrderLineSchema.parse({ sku: "NW-VITD-60", quantity: 1 })];
const makeOrder = (orderNumber: string): Order => ({
  orderNumber, createdAt: "2026-10-20T13:00:00Z", lines: products,
  shipTo: ShipToSchema.parse({ country: "US", state: "NJ", zip: "07030" }),
});

describe("routeOrders coordination", () => {
  let context: routing.RoutingContext;

  beforeEach(() => {
    vi.resetAllMocks();
    context = {
      events: [], catalog: CatalogSchema.parse({ products: [], bundles: [] }),
      zones: ZonesSchema.parse({ _note: "test", "WH-NJ": { "070": 1 } }),
      warehouses: WarehousesSchema.parse([{
        code: "WH-NJ", city: "Edison", enabled: true,
        inventory: { "NW-VITD-60": { available: 2, dailyVelocity: 1 } },
      }]),
    };
    vi.mocked(routing.prepareRoutingRun).mockResolvedValue(context);
    vi.mocked(reconstructCompleteOrders).mockReturnValue([makeOrder("#1")]);
    vi.mocked(sortOrdersByCreation).mockImplementation((orders) => orders);
    vi.mocked(routing.isUsDestination).mockReturnValue(true);
    vi.mocked(routing.checkPostalCoverage).mockReturnValue({ covered: true, prefix: ZipPrefixSchema.parse("070") });
    vi.mocked(resolveOrderProducts).mockReturnValue(products);
    vi.mocked(routing.findEligibleWarehouses).mockReturnValue(context.warehouses);
    const candidate = { warehouse: context.warehouses[0]!, zone: 1 };
    vi.mocked(routing.retainLowestZone).mockReturnValue([candidate]);
    vi.mocked(routing.retainHighestOrderCover).mockReturnValue([candidate]);
    vi.mocked(routing.applyWarehousePriority).mockReturnValue(candidate);
    vi.mocked(reserveStock).mockReturnValue(context.warehouses);
  });

  it("returns early for country without consulting postal data or stock", async () => {
    vi.mocked(routing.isUsDestination).mockReturnValue(false);
    const routes = await routeOrders();
    expect(routes).toEqual([{ orderNumber: "#1", kind: "partner", reason: "outside-us" }]);
    expect(routing.checkPostalCoverage).not.toHaveBeenCalled();
    expect(resolveOrderProducts).not.toHaveBeenCalled();
    expect(reserveStock).not.toHaveBeenCalled();
    expect(routing.publishRoutes).toHaveBeenCalledExactlyOnceWith(routes);
  });

  it("returns early for postal fallback without checking stock", async () => {
    vi.mocked(routing.checkPostalCoverage).mockReturnValue({ covered: false, reason: "missing-zip" });
    expect(await routeOrders()).toEqual([{ orderNumber: "#1", kind: "partner", reason: "missing-zip" }]);
    expect(routing.findEligibleWarehouses).not.toHaveBeenCalled();
    expect(reserveStock).not.toHaveBeenCalled();
  });

  it("passes empty candidates through every ranking step to fallback", async () => {
    vi.mocked(routing.findEligibleWarehouses).mockReturnValue([]);
    vi.mocked(routing.retainLowestZone).mockReturnValue([]);
    vi.mocked(routing.retainHighestOrderCover).mockReturnValue([]);
    vi.mocked(routing.applyWarehousePriority).mockReturnValue(undefined);
    expect(await routeOrders()).toEqual([{ orderNumber: "#1", kind: "partner", reason: "insufficient-stock" }]);
    expect(routing.retainLowestZone).toHaveBeenCalledWith([], expect.anything(), context.zones);
    expect(routing.retainHighestOrderCover).toHaveBeenCalledWith([], products);
    expect(routing.applyWarehousePriority).toHaveBeenCalledWith([]);
    expect(reserveStock).not.toHaveBeenCalled();
  });

  it("reserves stock before evaluating the next order and uses the returned state", async () => {
    const complete = [makeOrder("#2"), makeOrder("#1")];
    vi.mocked(reconstructCompleteOrders).mockReturnValue(complete);
    vi.mocked(sortOrdersByCreation).mockReturnValue([complete[1]!, complete[0]!]);
    const original = context.warehouses;
    const updated = structuredClone(original);
    updated[0]!.inventory[products[0]!.sku]!.available = 1;
    const calls: string[] = [];
    vi.mocked(routing.findEligibleWarehouses).mockImplementation((warehouses) => {
      calls.push(warehouses === original ? "first" : "next");
      return warehouses;
    });
    vi.mocked(reserveStock).mockImplementation(() => { calls.push("reserve"); return updated; });
    const routes = await routeOrders();
    expect(routes.map((route) => route.orderNumber)).toEqual(["#1", "#2"]);
    expect(calls.slice(0, 3)).toEqual(["first", "reserve", "next"]);
    expect(routing.findEligibleWarehouses).toHaveBeenNthCalledWith(2, updated, products);
    expect(reconstructCompleteOrders).toHaveBeenCalledWith(context.events);
    expect(sortOrdersByCreation).toHaveBeenCalledWith(complete);
    expect(routing.publishRoutes).toHaveBeenCalledExactlyOnceWith(routes);
  });
});
