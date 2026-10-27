import { describe, expect, it } from "vitest";
import { normalizeSku } from "./sku";

describe("normalizeSku", () => {
  it.each([
    ["nw-mag-90", "NW-MAG-90"],
    ["Nw-VitD-60", "NW-VITD-60"],
    ["NW-BNDL-ESS", "NW-BNDL-ESS"],
    [" nw-multi-30 ", " NW-MULTI-30 "],
  ])("uppercases %j without trimming", (input, expected) => {
    expect(normalizeSku(input)).toBe(expected);
    expect(normalizeSku(normalizeSku(input))).toBe(expected);
  });
});
