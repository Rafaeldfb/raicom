import { describe, expect, it } from "vitest";
import { CatalogSchema } from "../src/schemas/catalog.schema";
import { OrderEventsSchema } from "../src/schemas/order.schema";
import { WarehousesSchema } from "../src/schemas/warehouse.schema";
import { ZonesSchema } from "../src/schemas/zones.schema";
import { loadCatalog, loadOrders, loadWarehouses, loadZones } from "../src/lib/loader/Loader";

describe("dataset loaders", () => {
  it("derives fixture assessments without changing raw events or the loader cache", async () => {
    const raw = await loadOrders();
    const before = structuredClone(raw);
    const events = OrderEventsSchema.parse(raw);
    const cases = [
      {
        orderNumber: "#2033", zip: "02134",
        postalAssessment: { kind: "recognized", prefix: "021" },
      },
      {
        orderNumber: "#2039", zip: "07030-1834",
        postalAssessment: { kind: "recognized", prefix: "070" },
      },
      { orderNumber: "#2037", zip: "M5V 2T6", postalAssessment: null },
      { orderNumber: "#2046", zip: "", postalAssessment: { kind: "missing" } },
      {
        orderNumber: "#2042", zip: "96815",
        postalAssessment: { kind: "recognized", prefix: "968" },
      },
    ];
    for (const { orderNumber, zip, postalAssessment } of cases) {
      expect(events.find((event) => event.orderNumber === orderNumber)).toEqual(
        expect.objectContaining({ shipTo: expect.objectContaining({ zip, postalAssessment }) }),
      );
    }
    for (const event of events) {
      if (event.type === "order_created") {
        expect(typeof event.shipTo.zip).toBe("string");
        if (event.shipTo.postalAssessment !== null) {
          expect(event.shipTo.postalAssessment).not.toHaveProperty("value");
        }
      }
    }
    expect(raw).toEqual(before);
    expect(await loadOrders()).toEqual(before);
    expect(JSON.stringify(before)).not.toContain('"postalAssessment"');

    const zones = ZonesSchema.parse(await loadZones());
    for (const map of Object.values(zones)) {
      if (typeof map !== "string") expect(map).not.toHaveProperty("968");
    }
  });

  it("loads the four datasets for separate schema validation", async () => {
    const [rawCatalog, rawOrders, rawWarehouses, rawZones] = await Promise.all([
      loadCatalog(),
      loadOrders(),
      loadWarehouses(),
      loadZones(),
    ]);

    const catalog = CatalogSchema.parse(rawCatalog);
    const orders = OrderEventsSchema.parse(rawOrders);
    const warehouses = WarehousesSchema.parse(rawWarehouses);
    const zones = ZonesSchema.parse(rawZones);
    expect(catalog.products).toHaveLength(3);
    expect(catalog.bundles).toHaveLength(1);
    expect(orders).toHaveLength(27);
    expect(orders.find((event) => event.orderNumber === "#2045")).toEqual(
      expect.objectContaining({ lines: [{ sku: "NW-MAG-90", quantity: 1 }] }),
    );
    expect(rawOrders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderNumber: "#2045",
          lines: [{ sku: "nw-mag-90", quantity: 1 }],
        }),
      ]),
    );
    expect(warehouses).toHaveLength(4);
    expect(zones["WH-NJ"]).toEqual(expect.objectContaining({ "021": 3 }));
  });
});
