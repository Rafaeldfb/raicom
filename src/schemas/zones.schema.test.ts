import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WarehouseZonesSchema,
  ZipPrefixSchema,
  ZoneSchema,
  ZonesSchema,
} from "./zones.schema";

describe("ZonesSchema", () => {
  it("accepts the supplied table without changing metadata or mappings", () => {
    const raw: unknown = JSON.parse(
      readFileSync(new URL("../../data/zones.json", import.meta.url), "utf8"),
    );
    expect(ZonesSchema.parse(raw)).toEqual(raw);
  });

  it("preserves leading zeros, warehouse codes, and metadata text", () => {
    const input = {
      _note: " Shipping zones ",
      " WH-NJ ": { "021": 1, "070": 8 },
    };
    expect(ZonesSchema.parse(input)).toEqual(input);
  });

  it("does not require fixed warehouse or prefix counts", () => {
    const input = { _note: "Shipping zones", "WH-OTHER": {} };
    expect(ZonesSchema.parse(input)).toEqual(input);
    expect(ZonesSchema.parse({ _note: "Shipping zones" })).toEqual({
      _note: "Shipping zones",
    });
  });

  it.each([
    null,
    [],
    "zones",
    { "WH-NJ": { "021": 3 } },
    { _note: 1 },
    { _note: { "021": 3 } },
    { _note: "zones", "WH-NJ": "3" },
    { _note: "zones", "WH-NJ": 3 },
    { _note: "zones", "WH-NJ": null },
    { _note: "zones", "WH-NJ": [] },
    { _note: "zones", extra: "unexpected metadata" },
    { _note: "zones", "": { "021": 3 } },
    { _note: "zones", " \t\n": { "021": 3 } },
  ])("rejects malformed roots, metadata, and warehouse maps: %j", (input) => {
    expect(ZonesSchema.safeParse(input).success).toBe(false);
  });
});

describe("ZipPrefixSchema", () => {
  it.each(["021", "070", "100", "981"])(
    "accepts and preserves a three-digit prefix: %j",
    (input) => {
      expect(ZipPrefixSchema.parse(input)).toBe(input);
    },
  );

  it.each(["", "21", "0210", "02134", " 021", "021 ", "ABC", "０２１", 21])(
    "rejects an invalid prefix without repair: %j",
    (input) => {
      expect(ZipPrefixSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("ZoneSchema", () => {
  it.each([1, 3, 8])("accepts an in-range integer: %j", (input) => {
    expect(ZoneSchema.parse(input)).toBe(input);
  });

  it.each([0, 9, -1, 1.5, "3", null, true, Infinity, NaN])(
    "rejects an invalid zone without coercion: %j",
    (input) => {
      expect(ZoneSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("WarehouseZonesSchema", () => {
  it("validates both prefix keys and their zone values", () => {
    expect(WarehouseZonesSchema.safeParse({ "21": 3 }).success).toBe(false);
    expect(WarehouseZonesSchema.safeParse({ "021": "3" }).success).toBe(false);
    expect(WarehouseZonesSchema.safeParse({ extra: 3 }).success).toBe(false);
    expect(WarehouseZonesSchema.safeParse({ "021": 9 }).success).toBe(false);
  });
});
