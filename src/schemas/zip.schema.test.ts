import { describe, expect, expectTypeOf, it } from "vitest";
import {
  RawZipSchema as OrderRawZipSchema,
  type RawZipInput as OrderRawZipInput,
  type RawZipOutput as OrderRawZipOutput,
} from "./order.schema";
import {
  ZipPrefixSchema as ZonesZipPrefixSchema,
  type ZipPrefixInput as ZonesZipPrefixInput,
  type ZipPrefixOutput as ZonesZipPrefixOutput,
} from "./zones.schema";
import {
  PostalAssessmentSchema,
  RawZipSchema,
  ZipPrefixSchema,
  ZipValueSchema,
  type PostalAssessmentInput,
  type PostalAssessmentOutput,
  type RawZipInput,
  type RawZipOutput,
  type ZipPrefix,
  type ZipPrefixInput,
  type ZipPrefixOutput,
  type ZipValue,
} from "./zip.schema";

describe("RawZipSchema", () => {
  it.each(["07030", "", "M5V 2T6", " 07030 ", 2134, -1, 1.5, null, undefined])(
    "preserves supported source representation %j", (input) => {
      expect(RawZipSchema.parse(input)).toBe(input);
    },
  );

  it.each([true, [], {}, Infinity, -Infinity, NaN])(
    "rejects unsupported structural input %j", (input) => {
      expect(RawZipSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("canonical postal contracts", () => {
  it.each(["07030", "00000", "96815", "07030-1834"])(
    "validates and preserves ZIP value %j without checking assignment", (input) => {
      const output = ZipValueSchema.parse(input);
      expect(output).toBe(input);
      expectTypeOf(output).toEqualTypeOf<ZipValue>();
    },
  );

  it.each(["2134", "070301834", "07030\n", "07030-1834\n", " 07030", "07030 ", "０７０３０", 2134, null])(
    "rejects a noncanonical ZIP value %j", (input) => {
      expect(ZipValueSchema.safeParse(input).success).toBe(false);
    },
  );

  it.each(["021", "070", "000"])("preserves prefix %j", (input) => {
    const output = ZipPrefixSchema.parse(input);
    expect(output).toBe(input);
    expectTypeOf(output).toEqualTypeOf<ZipPrefix>();
  });

  it.each(["21", "07030", "070\n", " 070", "０７０", 70, null])(
    "rejects a noncanonical prefix %j", (input) => {
      expect(ZipPrefixSchema.safeParse(input).success).toBe(false);
    },
  );

  it("keeps branded outputs distinct from arbitrary strings", () => {
    expectTypeOf<string>().not.toMatchTypeOf<ZipValue>();
    expectTypeOf<string>().not.toMatchTypeOf<ZipPrefix>();
    expectTypeOf<ZipPrefixInput>().toEqualTypeOf<string>();
    expectTypeOf<ZipPrefixOutput>().toEqualTypeOf<ZipPrefix>();
  });
});

describe("PostalAssessmentSchema", () => {
  it.each([
    { kind: "recognized", prefix: "021" },
    { kind: "recognized", prefix: "070" },
    { kind: "missing" },
    { kind: "unrecognized" },
  ])("accepts a supported assessment %j", (input) => {
    expect(PostalAssessmentSchema.parse(input)).toEqual(input);
  });

  it.each([
    null, {}, { kind: "international" },
    { kind: "recognized" },
    { kind: "recognized", value: "07030", prefix: "070", reason: "mapped" },
    { kind: "recognized", value: "0703", prefix: "070" },
    { kind: "recognized", value: "07030", prefix: 70 },
    { kind: "missing", value: "07030" },
    { kind: "missing", prefix: "070" },
    { kind: "unrecognized", reason: "invalid" },
  ])("rejects malformed or enriched assessment %j", (input) => {
    expect(PostalAssessmentSchema.safeParse(input).success).toBe(false);
  });

  it("infers unbranded inputs and canonical recognized outputs", () => {
    type Input = Extract<PostalAssessmentInput, { kind: "recognized" }>;
    type Output = Extract<PostalAssessmentOutput, { kind: "recognized" }>;
    expectTypeOf<"value">().not.toMatchTypeOf<keyof Output>();
    expectTypeOf<Input["prefix"]>().toEqualTypeOf<string>();
    expectTypeOf<Output["prefix"]>().toEqualTypeOf<ZipPrefix>();
  });
});

describe("compatibility exports", () => {
  it("retains the existing raw ZIP and zone prefix import paths", () => {
    expect(OrderRawZipSchema).toBe(RawZipSchema);
    expect(ZonesZipPrefixSchema).toBe(ZipPrefixSchema);
    expectTypeOf<OrderRawZipInput>().toEqualTypeOf<RawZipInput>();
    expectTypeOf<OrderRawZipOutput>().toEqualTypeOf<RawZipOutput>();
    expectTypeOf<ZonesZipPrefixInput>().toEqualTypeOf<ZipPrefixInput>();
    expectTypeOf<ZonesZipPrefixOutput>().toEqualTypeOf<ZipPrefixOutput>();
  });
});
