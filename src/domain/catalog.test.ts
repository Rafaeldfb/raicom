import { describe, expect, it } from "vitest";
import { CatalogSchema } from "../schemas/catalog.schema";
import { OrderEventsSchema } from "../schemas/order.schema";
import { SkuSchema } from "../schemas/sku.schema";
import { resolveOrderProducts } from "./catalog";
import { reconstructCompleteOrders } from "./order";

const catalog = CatalogSchema.parse({
  products: [
    { sku: "NW-VITD-60", name: "Vitamin", priceCents: 100 },
    { sku: "NW-MAG-90", name: "Magnesium", priceCents: 100 },
  ],
  bundles: [{ sku: "NW-BNDL-ESS", name: "Bundle", priceCents: 100,
    components: [{ sku: "NW-VITD-60", quantity: 1 }, { sku: "NW-MAG-90", quantity: 1 }] }],
});
const orderWith = (sku: string) => reconstructCompleteOrders(OrderEventsSchema.parse([{
  type: "order_created", orderNumber: "#1", at: "2026-10-20T13:00:00Z",
  shipTo: { country: "US", state: "NJ", zip: "07030" }, lines: [{ sku, quantity: 1 }],
}]))[0]!;

describe("resolveOrderProducts", () => {
  it("aggregates canonical standalone product quantities without changing order or catalog", () => {
    const order = orderWith("nw-vitd-60");
    const magnesium = orderWith("NW-MAG-90").lines[0]!;
    order.lines.push({ ...order.lines[0]!, quantity: 2 }, magnesium);
    const before = structuredClone({ order, catalog });
    expect(resolveOrderProducts(order, catalog)).toEqual([
      { sku: "NW-VITD-60", quantity: 3 }, { sku: "NW-MAG-90", quantity: 1 },
    ]);
    expect({ order, catalog }).toEqual(before);
  });

  it("multiplies bundle quantities and combines overlapping direct and bundle demand", () => {
    const order = orderWith("nw-bndl-ess");
    order.lines[0]!.quantity = 2;
    order.lines.push(orderWith("NW-VITD-60").lines[0]!, orderWith("NW-BNDL-ESS").lines[0]!);
    const before = structuredClone({ order, catalog });
    expect(resolveOrderProducts(order, catalog)).toEqual([
      { sku: "NW-VITD-60", quantity: 4 }, { sku: "NW-MAG-90", quantity: 3 },
    ]);
    expect({ order, catalog }).toEqual(before);
  });

  it("multiplies each catalog component quantity, not just the bundle count", () => {
    const weighted = structuredClone(catalog);
    weighted.bundles[0]!.components[0]!.quantity = 3;
    const order = orderWith("NW-BNDL-ESS");
    order.lines[0]!.quantity = 2;
    expect(resolveOrderProducts(order, weighted)).toEqual([
      { sku: "NW-VITD-60", quantity: 6 }, { sku: "NW-MAG-90", quantity: 2 },
    ]);
  });

  it("combines shared components across distinct bundle definitions", () => {
    const shared = structuredClone(catalog);
    shared.bundles.push(CatalogSchema.parse({ products: [], bundles: [{
      sku: "NW-BNDL-SECOND", name: "Second bundle", priceCents: 100,
      components: [{ sku: "NW-VITD-60", quantity: 2 }],
    }] }).bundles[0]!);
    const order = orderWith("NW-BNDL-ESS");
    order.lines.push(orderWith("NW-BNDL-SECOND").lines[0]!);
    expect(resolveOrderProducts(order, shared)).toEqual([
      { sku: "NW-VITD-60", quantity: 3 }, { sku: "NW-MAG-90", quantity: 1 },
    ]);
  });

  it("includes eligible bundle edits before resolving component demand", () => {
    const events = OrderEventsSchema.parse([
      { type: "order_created", orderNumber: "#1", at: "2026-10-20T13:00:00Z",
        shipTo: { country: "US", state: "NJ", zip: "07030" },
        lines: [{ sku: "NW-VITD-60", quantity: 1 }] },
      { type: "order_edited", orderNumber: "#1", at: "2026-10-20T13:18:00Z",
        addedLines: [{ sku: "nw-bndl-ess", quantity: 2 }] },
      { type: "order_edited", orderNumber: "#1", at: "2026-10-20T13:31:00Z",
        addedLines: [{ sku: "NW-BNDL-ESS", quantity: 100 }] },
    ]);
    expect(resolveOrderProducts(reconstructCompleteOrders(events)[0]!, catalog)).toEqual([
      { sku: "NW-VITD-60", quantity: 3 }, { sku: "NW-MAG-90", quantity: 2 },
    ]);
  });

  it.each(["NW-UNKNOWN", "NW-BNDL-ESS"])("rejects unsupported component reference %s without recursion", (sku) => {
    const unsupported = structuredClone(catalog);
    unsupported.bundles[0]!.components[0]!.sku = SkuSchema.parse(sku);
    expect(() => resolveOrderProducts(orderWith("NW-BNDL-ESS"), unsupported)).toThrow("Unsupported bundle component");
  });

  it("keeps general unknown-SKU policy explicitly unimplemented", () => {
    expect(() => resolveOrderProducts(orderWith("NW-UNKNOWN"), catalog)).toThrow("unknown SKU handling not implemented");
  });
});
