import { beforeEach, describe, expect, it, vi } from "vitest";
import { rawCatalog, rawOrders, rawWarehouses, rawZones } from "../../tests/fixtures/cli-routing/fixtures";
import { readCatalog } from "../repositories/catalog.repository";
import { readOrderEvents } from "../repositories/orders.repository";
import { readWarehouses } from "../repositories/warehouses.repository";
import { readZones } from "../repositories/zones.repository";
import { writeRoutes } from "../repositories/routes.repository";
import { CatalogSchema } from "../schemas/catalog.schema";
import { OrderEventsSchema } from "../schemas/order.schema";
import { SkuSchema } from "../schemas/sku.schema";
import { WarehousesSchema } from "../schemas/warehouse.schema";
import { ZonesSchema } from "../schemas/zones.schema";
import { prepareRoutingRun, publishRoutes, type RoutingResult } from "./routing";

vi.mock("../repositories/catalog.repository", () => ({ readCatalog: vi.fn() }));
vi.mock("../repositories/orders.repository", () => ({ readOrderEvents: vi.fn() }));
vi.mock("../repositories/warehouses.repository", () => ({ readWarehouses: vi.fn() }));
vi.mock("../repositories/zones.repository", () => ({ readZones: vi.fn() }));
vi.mock("../repositories/routes.repository", () => ({ writeRoutes: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readCatalog).mockImplementation(async () => CatalogSchema.parse(rawCatalog));
  vi.mocked(readOrderEvents).mockImplementation(async () => OrderEventsSchema.parse(rawOrders));
  vi.mocked(readWarehouses).mockImplementation(async () => WarehousesSchema.parse(rawWarehouses));
  vi.mocked(readZones).mockImplementation(async () => ZonesSchema.parse(rawZones));
});

describe("publishRoutes", () => {
  it("passes structured results to the output repository", async () => {
    const routes: RoutingResult[] = [{ orderNumber: "#1", kind: "partner", reason: "missing-zip" }];
    await publishRoutes(routes);
    expect(writeRoutes).toHaveBeenCalledExactlyOnceWith(routes);
  });

  it("propagates output errors", async () => {
    const failure = new Error("output unavailable");
    vi.mocked(writeRoutes).mockRejectedValue(failure);
    await expect(publishRoutes([])).rejects.toBe(failure);
  });
});

describe("prepareRoutingRun", () => {
  it("obtains every dataset once through parameterless repositories", async () => {
    const context = await prepareRoutingRun();
    for (const read of [readCatalog, readOrderEvents, readWarehouses, readZones]) {
      expect(read).toHaveBeenCalledExactlyOnceWith();
    }
    expect(context.events).toHaveLength(18);
    expect(context.catalog.products).toHaveLength(2);
    expect(context.warehouses).toHaveLength(4);
  });

  it("does not retain inventory or event changes between runs", async () => {
    const first = await prepareRoutingRun();
    first.warehouses[0]!.inventory[SkuSchema.parse("NW-VITD-60")]!.available = 0;
    first.events.length = 0;
    const second = await prepareRoutingRun();
    expect(second.warehouses[0]!.inventory[SkuSchema.parse("NW-VITD-60")]!.available).toBe(6);
    expect(second.events).toHaveLength(18);
  });

  it("propagates ingestion errors rather than producing a routing outcome", async () => {
    const failure = new Error("cannot read orders");
    vi.mocked(readOrderEvents).mockRejectedValue(failure);
    await expect(prepareRoutingRun()).rejects.toBe(failure);
  });
});
