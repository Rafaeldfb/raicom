import { beforeEach, describe, expect, it, vi } from "vitest";
import { rawCatalog, rawOrders, rawWarehouses, rawZones } from "../../tests/fixtures/cli-routing/fixtures";
import { loadCatalog, loadOrders, loadWarehouses, loadZones } from "../lib/loader/Loader";
import { SkuSchema } from "../schemas/sku.schema";
import { readCatalog } from "./catalog.repository";
import { readOrderEvents } from "./orders.repository";
import { readWarehouses } from "./warehouses.repository";
import { readZones } from "./zones.repository";

vi.mock("../lib/loader/Loader", () => ({
  loadCatalog: vi.fn(), loadOrders: vi.fn(), loadWarehouses: vi.fn(), loadZones: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe("input repositories", () => {
  it("returns canonical catalog identifiers without changing input", async () => {
    const raw = structuredClone(rawCatalog);
    raw.products[0]!.sku = "nw-vitd-60";
    vi.mocked(loadCatalog).mockResolvedValue(raw);
    const output = await readCatalog();
    expect(output.products[0]!.sku).toBe("NW-VITD-60");
    expect(raw.products[0]!.sku).toBe("nw-vitd-60");
    expect(loadCatalog).toHaveBeenCalledExactlyOnceWith();
  });

  it("returns enriched events once while preserving raw ZIP types and event order", async () => {
    const raw = structuredClone(rawOrders);
    const before = structuredClone(raw);
    vi.mocked(loadOrders).mockResolvedValue(raw);
    const output = await readOrderEvents();
    const repaired = output.find((event) => event.orderNumber === "#A15");
    expect(repaired).toMatchObject({
      shipTo: { zip: "02134", postalAssessment: { kind: "recognized", prefix: "021" } },
      lines: [{ sku: "NW-VITD-60", quantity: 1 }],
    });
    expect(output[0]!.orderNumber).toBe("#A3");
    expect(output).toHaveLength(18);
    expect(raw).toEqual(before);
    expect(loadOrders).toHaveBeenCalledExactlyOnceWith();
  });

  it("returns canonical inventory keys with independent mutable output", async () => {
    const raw = structuredClone(rawWarehouses);
    const inventory = raw[0]!.inventory;
    const { "NW-VITD-60": vitamin, ...rest } = inventory;
    vi.mocked(loadWarehouses).mockResolvedValue([{ ...raw[0], inventory: { ...rest, "nw-vitd-60": vitamin } }]);
    const output = await readWarehouses();
    const sku = SkuSchema.parse("NW-VITD-60");
    expect(output[0]!.inventory[sku]).toEqual({ available: 6, dailyVelocity: 2 });
    output[0]!.inventory[sku]!.available = 0;
    expect(vitamin.available).toBe(6);
    expect(loadWarehouses).toHaveBeenCalledExactlyOnceWith();
  });

  it("preserves metadata and leading-zero zone prefixes", async () => {
    vi.mocked(loadZones).mockResolvedValue(rawZones);
    const output = await readZones();
    expect(output._note).toBe(rawZones._note);
    expect(output["WH-NJ"]).toMatchObject({ "021": 1, "070": 2 });
    expect(loadZones).toHaveBeenCalledExactlyOnceWith();
  });

  const repositories = [
    { name: "catalog", read: readCatalog, load: loadCatalog },
    { name: "orders", read: readOrderEvents, load: loadOrders },
    { name: "warehouses", read: readWarehouses, load: loadWarehouses },
    { name: "zones", read: readZones, load: loadZones },
  ];
  it.each(repositories)("propagates $name loading failures", async ({ read, load }) => {
    const failure = new Error("input unavailable");
    vi.mocked(load).mockRejectedValue(failure);
    await expect(read()).rejects.toBe(failure);
  });
  it.each(repositories)("propagates $name structural validation failures", async ({ read, load }) => {
    vi.mocked(load).mockResolvedValue(null);
    await expect(read()).rejects.toMatchObject({ name: "ZodError" });
  });
});
