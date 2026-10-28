import { describe, expect, it } from "vitest";
import { rawWarehouses } from "../../tests/fixtures/cli-routing/fixtures";
import { OrderLineSchema } from "../schemas/order.schema";
import { SkuSchema } from "../schemas/sku.schema";
import { WarehousesSchema } from "../schemas/warehouse.schema";
import { reserveStock } from "./warehouse";

const vitamin = SkuSchema.parse("NW-VITD-60");
const magnesium = SkuSchema.parse("NW-MAG-90");
const products = [
  OrderLineSchema.parse({ sku: vitamin, quantity: 2 }),
  OrderLineSchema.parse({ sku: magnesium, quantity: 1 }),
];

describe("stock reservation", () => {
  it("decrements all required products only at the selected warehouse", () => {
    const warehouses = WarehousesSchema.parse(rawWarehouses);
    const before = structuredClone(warehouses);
    const updated = reserveStock(warehouses, "WH-NJ", products);
    expect(updated[0]!.inventory[vitamin]).toEqual({ available: 4, dailyVelocity: 2 });
    expect(updated[0]!.inventory[magnesium]).toEqual({ available: 3, dailyVelocity: 1 });
    expect(updated.slice(1)).toEqual(before.slice(1));
    expect(warehouses).toEqual(before);
    expect(updated).not.toBe(warehouses);
  });

  it("supports exact depletion and carries the updated state to subsequent reservations", () => {
    const warehouses = WarehousesSchema.parse(rawWarehouses);
    const first = reserveStock(warehouses, "WH-NJ", products);
    const remaining = [OrderLineSchema.parse({ sku: vitamin, quantity: 4 })];
    const second = reserveStock(first, "WH-NJ", remaining);
    expect(second[0]!.inventory[vitamin]!.available).toBe(0);
    expect(first[0]!.inventory[vitamin]!.available).toBe(4);
    expect(() => reserveStock(second, "WH-NJ", remaining)).toThrow("cannot fulfill");
  });

  it.each(["WH-TX", "WH-MISSING"])("rejects an unavailable selection: %s", (code) => {
    expect(() => reserveStock(WarehousesSchema.parse(rawWarehouses), code, products)).toThrow("cannot fulfill");
  });

  it("does not partially reserve when one product is insufficient", () => {
    const warehouses = WarehousesSchema.parse(rawWarehouses);
    const before = structuredClone(warehouses);
    const tooMuch = [...products, OrderLineSchema.parse({ sku: "NW-MULTI-30", quantity: 1 })];
    expect(() => reserveStock(warehouses, "WH-NJ", tooMuch)).toThrow("cannot fulfill");
    expect(warehouses).toEqual(before);
  });
});
