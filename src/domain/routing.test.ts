import { describe, expect, it } from "vitest";
import { OrderLineSchema, ShipToSchema } from "../schemas/order.schema";
import { WarehouseSchema } from "../schemas/warehouse.schema";
import { ZonesSchema } from "../schemas/zones.schema";
import { ZipPrefixSchema } from "../schemas/zip.schema";
import {
  applyWarehousePriority, checkPostalCoverage, findEligibleWarehouses, isUsDestination,
  retainHighestOrderCover, retainLowestZone,
} from "./routing";

const destination = (zip: string | number | null | undefined, country = "US") =>
  ShipToSchema.parse({ country, state: "NJ", zip });
const demand = (vitamin = 1, magnesium = 0) => [
  OrderLineSchema.parse({ sku: "NW-VITD-60", quantity: vitamin }),
  ...(magnesium ? [OrderLineSchema.parse({ sku: "NW-MAG-90", quantity: magnesium })] : []),
];
const warehouse = (code: string, options: {
  available?: number; velocity?: number; magnesium?: number; magnesiumVelocity?: number; enabled?: boolean;
} = {}) => WarehouseSchema.parse({
  code, city: "Test city", enabled: options.enabled ?? true,
  inventory: {
    "NW-VITD-60": { available: options.available ?? 10, dailyVelocity: options.velocity ?? 1 },
    "NW-MAG-90": { available: options.magnesium ?? 10, dailyVelocity: options.magnesiumVelocity ?? 1 },
  },
});
const zones = ZonesSchema.parse({ _note: "test", "WH-NJ": { "070": 1, "021": 3 } });

describe("country and postal eligibility", () => {
  it.each([["US", true], ["CA", false], ["us", false], [" US ", false]])(
    "matches country exactly: %s", (country, expected) => {
      expect(isUsDestination(destination("07030", country))).toBe(expected);
    },
  );

  it.each([undefined, null, ""])("routes missing postal input to fallback: %j", (zip) => {
    expect(checkPostalCoverage(destination(zip).postalAssessment, zones)).toEqual({ covered: false, reason: "missing-zip" });
  });

  it.each(["2134", " 07030", "07030\n", "   "])("does not repair unrecognized strings: %j", (zip) => {
    expect(checkPostalCoverage(destination(zip).postalAssessment, zones)).toEqual({ covered: false, reason: "unrecognized-zip" });
  });

  it.each([[2134, "021"], ["07030-1834", "070"]])("uses assessed prefix for %j", (zip, prefix) => {
    expect(checkPostalCoverage(destination(zip).postalAssessment, zones)).toEqual({ covered: true, prefix });
  });

  it("distinguishes recognized format from zone coverage", () => {
    expect(checkPostalCoverage(destination("96815").postalAssessment, zones)).toEqual({ covered: false, reason: "unmapped-prefix" });
  });

  it("does not treat metadata text as zone coverage", () => {
    const noCoverage = ZonesSchema.parse({ _note: "070", "WH-NJ": {} });
    expect(checkPostalCoverage(destination("07030").postalAssessment, noCoverage).covered).toBe(false);
  });
});

describe("warehouse eligibility", () => {
  it("requires enabled status and sufficient stock for all products, including exact stock", () => {
    const candidates = [
      warehouse("WH-NJ", { available: 2, magnesium: 3 }),
      warehouse("WH-GA", { available: 2, magnesium: 2 }),
      warehouse("WH-NV", { available: 1, magnesium: 20 }),
      warehouse("WH-TX", { enabled: false, available: 100, magnesium: 100 }),
    ];
    const before = structuredClone(candidates);
    expect(findEligibleWarehouses(candidates, demand(2, 3)).map((item) => item.code)).toEqual(["WH-NJ"]);
    expect(candidates).toEqual(before);
  });

  it("never combines stock across warehouses", () => {
    const candidates = [warehouse("WH-NJ", { available: 2 }), warehouse("WH-GA", { available: 3 })];
    expect(findEligibleWarehouses(candidates, demand(5))).toEqual([]);
    expect(findEligibleWarehouses([], demand())).toEqual([]);
  });

  it("rejects a warehouse with no inventory entry for a requested product", () => {
    const candidate = WarehouseSchema.parse({ code: "WH-NJ", city: "Edison", enabled: true, inventory: {} });
    expect(findEligibleWarehouses([candidate], demand())).toEqual([]);
  });
});

describe("candidate ranking", () => {
  const prefix = ZipPrefixSchema.parse("070");

  it("retains all lowest-zone ties, excluding warehouses without that mapping", () => {
    const candidates = [warehouse("WH-NJ"), warehouse("WH-GA"), warehouse("WH-NV"), warehouse("WH-TX")];
    const before = structuredClone(candidates);
    const maps = ZonesSchema.parse({ _note: "test", "WH-NJ": { "070": 2 }, "WH-GA": { "070": 2 }, "WH-NV": { "070": 4 } });
    expect(retainLowestZone(candidates, prefix, maps).map((item) => [item.warehouse.code, item.zone])).toEqual([
      ["WH-NJ", 2], ["WH-GA", 2],
    ]);
    expect(candidates).toEqual(before);
    expect(retainLowestZone([warehouse("WH-TX")], prefix, maps)).toEqual([]);
  });

  it("prefers zone before cover", () => {
    const candidates = [warehouse("WH-NJ", { available: 2 }), warehouse("WH-GA", { available: 100 })];
    const maps = ZonesSchema.parse({ _note: "test", "WH-NJ": { "070": 1 }, "WH-GA": { "070": 2 } });
    const closest = retainLowestZone(candidates, prefix, maps);
    expect(retainHighestOrderCover(closest, demand()).map((item) => item.warehouse.code)).toEqual(["WH-NJ"]);
  });

  it("maximizes minimum cover across all products using pre-reservation stock", () => {
    const candidates = [
      { warehouse: warehouse("WH-NJ", { available: 10, magnesium: 1 }), zone: 2 },
      { warehouse: warehouse("WH-GA", { available: 6, velocity: 2, magnesium: 8 }), zone: 2 },
    ];
    const before = structuredClone(candidates);
    expect(retainHighestOrderCover(candidates, demand(2, 1)).map((item) => item.warehouse.code)).toEqual(["WH-GA"]);
    expect(candidates).toEqual(before);
  });

  it("does not subtract requested quantity before comparing cover", () => {
    const candidates = [
      { warehouse: warehouse("WH-NJ", { available: 6, velocity: 2 }), zone: 2 },
      { warehouse: warehouse("WH-GA", { available: 11, velocity: 4 }), zone: 2 },
    ];
    expect(retainHighestOrderCover(candidates, demand(4))[0]!.warehouse.code).toBe("WH-NJ");
  });

  it("retains finite and infinite cover ties without rounding or subtracting infinities", () => {
    const finite = [
      { warehouse: warehouse("WH-NJ", { available: 6, velocity: 2 }), zone: 2 },
      { warehouse: warehouse("WH-GA", { available: 9, velocity: 3 }), zone: 2 },
    ];
    expect(retainHighestOrderCover(finite, demand())).toEqual(finite);
    const infinite = [
      { warehouse: warehouse("WH-NJ", { velocity: 0 }), zone: 2 },
      { warehouse: warehouse("WH-GA", { velocity: 0 }), zone: 2 },
    ];
    expect(retainHighestOrderCover([...finite, ...infinite], demand())).toEqual(infinite);
  });

  it("allows a finite product to limit an otherwise infinite order cover", () => {
    const candidates = [
      { warehouse: warehouse("WH-NJ", { velocity: 0, magnesium: 1 }), zone: 2 },
      { warehouse: warehouse("WH-GA", { available: 2, magnesium: 3 }), zone: 2 },
    ];
    expect(retainHighestOrderCover(candidates, demand(1, 1))[0]!.warehouse.code).toBe("WH-GA");
  });

  it.each(["WH-NJ", "WH-GA", "WH-NV", "WH-TX"])("uses the required priority beginning with %s", (expected) => {
    const priority = ["WH-NJ", "WH-GA", "WH-NV", "WH-TX"];
    const candidates = priority.slice(priority.indexOf(expected)).reverse().map((code) => ({ warehouse: warehouse(code), zone: 2 }));
    expect(applyWarehousePriority(candidates)!.warehouse.code).toBe(expected);
  });

  it("preserves empty candidates all the way through fallback", () => {
    expect(retainLowestZone([], prefix, zones)).toEqual([]);
    expect(retainHighestOrderCover([], demand())).toEqual([]);
    expect(applyWarehousePriority([])).toBeUndefined();
  });
});
