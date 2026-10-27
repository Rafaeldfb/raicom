import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  InventoryEntrySchema,
  WarehouseSchema,
  WarehousesSchema,
  type WarehouseInput,
  type WarehouseOutput,
} from "./warehouse.schema";
import type { Sku } from "./sku.schema";

const entry = { available: 400, dailyVelocity: 40 };
const warehouse = {
  code: "WH-NJ",
  city: "Edison, NJ",
  enabled: true,
  inventory: { "NW-VITD-60": entry },
};

describe("WarehousesSchema", () => {
  it("accepts the supplied warehouses without changing their values", () => {
    const raw: unknown = JSON.parse(
      readFileSync(new URL("../../data/warehouses.json", import.meta.url), "utf8"),
    );
    expect(WarehousesSchema.parse(raw)).toEqual(raw);
  });

  it("does not require a fixed number of warehouses", () => {
    expect(WarehousesSchema.parse([])).toEqual([]);
    expect(WarehousesSchema.parse([warehouse])).toEqual([warehouse]);
  });

  it.each([warehouse, null, "warehouses"])(
    "rejects a non-array root: %j",
    (input) => {
      expect(WarehousesSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("WarehouseSchema", () => {
  it("normalizes SKU keys while preserving warehouse fields and inventory", () => {
    const input = {
      ...warehouse,
      code: " WH-NJ ",
      city: " Edison, NJ ",
      enabled: false,
      inventory: { " nw-mag-90 ": { available: 0, dailyVelocity: 0 } },
    };
    const output = WarehouseSchema.parse(input);
    expect(output).toEqual({
      ...input,
      inventory: { " NW-MAG-90 ": { available: 0, dailyVelocity: 0 } },
    });
    expect(Object.keys(input.inventory)).toEqual([" nw-mag-90 "]);
    expectTypeOf<keyof WarehouseInput["inventory"]>().toEqualTypeOf<string>();
    expectTypeOf<keyof WarehouseOutput["inventory"]>().toEqualTypeOf<Sku>();
  });

  it("accepts an empty inventory without checking catalog coverage", () => {
    const input = { ...warehouse, inventory: {} };
    expect(WarehouseSchema.parse(input)).toEqual(input);
  });

  it.each([
    { ...warehouse, code: "" },
    { ...warehouse, code: " \t\n" },
    { ...warehouse, code: 1 },
    { ...warehouse, city: " \t\n" },
    { ...warehouse, city: null },
    { ...warehouse, enabled: "true" },
    { ...warehouse, enabled: 1 },
    { ...warehouse, inventory: [] },
    { ...warehouse, inventory: { "": entry } },
    { ...warehouse, inventory: { " \t\n": entry } },
    { code: "WH-NJ", city: "Edison, NJ", inventory: {} },
    { ...warehouse, extra: true },
    { ...warehouse, inventory: { "NW-VITD-60": { ...entry, extra: true } } },
    { ...warehouse, inventory: { "NW-VITD-60": { available: 10 } } },
  ])("rejects malformed fields without coercion: %j", (input) => {
    expect(WarehouseSchema.safeParse(input).success).toBe(false);
  });
});

describe("InventoryEntrySchema", () => {
  it("accepts zero stock and zero velocity independently of routing", () => {
    expect(InventoryEntrySchema.parse({ available: 0, dailyVelocity: 0 })).toEqual(
      { available: 0, dailyVelocity: 0 },
    );
  });

  it("allows fractional velocity because velocity is a rate", () => {
    const input = { available: 10, dailyVelocity: 2.5 };
    expect(InventoryEntrySchema.parse(input)).toEqual(input);
  });

  it.each(["400", -1, 0.5, null, true, Infinity])(
    "rejects an invalid stock count: %j",
    (available) => {
      expect(InventoryEntrySchema.safeParse({ ...entry, available }).success).toBe(
        false,
      );
    },
  );

  it.each(["40", -1, null, true, Infinity, NaN])(
    "rejects an invalid velocity: %j",
    (dailyVelocity) => {
      expect(
        InventoryEntrySchema.safeParse({ ...entry, dailyVelocity }).success,
      ).toBe(false);
    },
  );
});
