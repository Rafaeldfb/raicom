import { describe, expect, expectTypeOf, it } from "vitest";
import {
  CanonicalSkuSchema,
  SkuSchema,
  type Sku,
  type SkuInput,
} from "./sku.schema";

describe("SkuSchema", () => {
  it.each([
    ["NW-VITD-60", "NW-VITD-60"],
    ["NW-MULTI-30", "NW-MULTI-30"],
    ["NW-BNDL-ESS", "NW-BNDL-ESS"],
    ["nw-mag-90", "NW-MAG-90"],
    ["Nw-Mag-90", "NW-MAG-90"],
    [" nw-mag-90 ", " NW-MAG-90 "],
  ])(
    "produces a canonical identifier from %j",
    (input, expected) => {
      const sku = SkuSchema.parse(input);
      expect(sku).toBe(expected);
      expect(SkuSchema.parse(sku)).toBe(sku);
      expectTypeOf(sku).toEqualTypeOf<Sku>();
    },
  );

  it("distinguishes raw string inputs from branded outputs", () => {
    expectTypeOf<SkuInput>().toEqualTypeOf<string>();
    expectTypeOf<string>().not.toMatchTypeOf<Sku>();
  });

  it.each(["", " \t\n", 123, null, true, {}])(
    "rejects blank or non-string identifiers: %j",
    (input) => {
      expect(SkuSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("CanonicalSkuSchema", () => {
  it("validates uppercase values without normalizing them", () => {
    expect(CanonicalSkuSchema.parse("NW-BNDL-ESS")).toBe("NW-BNDL-ESS");
    expect(CanonicalSkuSchema.safeParse("nw-mag-90").success).toBe(false);
    expect(CanonicalSkuSchema.safeParse(" \t\n").success).toBe(false);
  });
});
