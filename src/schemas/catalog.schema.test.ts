import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BundleSchema,
  CatalogSchema,
  ComponentSchema,
  ProductSchema,
} from "./catalog.schema";

const product = {
  sku: "NW-VITD-60",
  name: "Vitamin D, 60 softgels",
  priceCents: 2995,
};

const component = { sku: product.sku, quantity: 1 };
const bundle = {
  sku: "NW-BNDL-ESS",
  name: "Daily Essentials Bundle",
  priceCents: 5495,
  components: [component],
};

describe("CatalogSchema", () => {
  it("accepts the supplied catalog without changing its values", () => {
    const raw: unknown = JSON.parse(
      readFileSync(new URL("../../data/catalog.json", import.meta.url), "utf8"),
    );

    expect(CatalogSchema.parse(raw)).toEqual(raw);
  });

  it("allows empty product and bundle arrays", () => {
    const input = { products: [], bundles: [] };
    expect(CatalogSchema.parse(input)).toEqual(input);
  });

  it.each([
    null,
    "catalog",
    [],
    { products: [] },
    { bundles: [] },
    { products: {}, bundles: [] },
  ])("rejects an invalid catalog structure: %j", (input) => {
    expect(CatalogSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    { products: [product], bundles: [], extra: true },
    { products: [{ ...product, extra: true }], bundles: [] },
    { products: [], bundles: [{ ...bundle, extra: true }] },
    {
      products: [],
      bundles: [{ ...bundle, components: [{ ...component, extra: true }] }],
    },
  ])("rejects unknown fields at every object level: %j", (input) => {
    expect(CatalogSchema.safeParse(input).success).toBe(false);
  });
});

describe("ProductSchema", () => {
  it("accepts a zero price and preserves surrounding name whitespace", () => {
    const input = { ...product, name: " Vitamin D ", priceCents: 0 };
    expect(ProductSchema.parse(input)).toEqual(input);
  });

  it.each(["2995", -1, 1.5, null, true])(
    "rejects a non-integer, negative, or non-number price: %j",
    (priceCents) => {
      expect(ProductSchema.safeParse({ ...product, priceCents }).success).toBe(
        false,
      );
    },
  );

  it.each(["", " \t\n", 1])("rejects an unusable name: %j", (name) => {
    expect(ProductSchema.safeParse({ ...product, name }).success).toBe(false);
  });
});

describe("BundleSchema", () => {
  it("keeps component quantities intact without expanding or normalizing", () => {
    const input = {
      ...bundle,
      components: [{ sku: " nw-mag-90 ", quantity: 2 }],
    };
    expect(BundleSchema.parse(input)).toEqual(input);
  });

  it("requires at least one component", () => {
    expect(BundleSchema.safeParse({ ...bundle, components: [] }).success).toBe(
      false,
    );
  });

  it.each(["1", 0, -1, 1.5, null, true])(
    "rejects a non-positive, non-integer, or non-number component quantity: %j",
    (quantity) => {
      expect(ComponentSchema.safeParse({ ...component, quantity }).success).toBe(
        false,
      );
    },
  );
});
