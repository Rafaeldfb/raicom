import { describe, expect, it } from "vitest";
import { SkuSchema } from "./sku.schema";

describe("SkuSchema", () => {
  it.each(["NW-VITD-60", "NW-BNDL-ESS", "nw-mag-90", " NW-MAG-90 "])(
    "preserves the supplied identifier %j",
    (input) => {
      expect(SkuSchema.parse(input)).toBe(input);
    },
  );

  it.each(["", " \t\n", 123, null, true, {}])(
    "rejects blank or non-string identifiers: %j",
    (input) => {
      expect(SkuSchema.safeParse(input).success).toBe(false);
    },
  );
});
