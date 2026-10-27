import { readFileSync } from "node:fs";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import * as zipNormalization from "../normalization/zip";
import {
  EventTimestampSchema,
  OrderEventSchema,
  OrderEventsSchema,
  OrderLineSchema,
  RawShipToSchema,
  ShipToSchema,
  type OrderEventsInput,
  type OrderLineInput,
  type OrderLineOutput,
  type ShipToInput,
  type ShipToOutput,
} from "./order.schema";
import type { Sku } from "./sku.schema";
import type { PostalAssessmentOutput } from "./zip.schema";

const line = { sku: "NW-VITD-60", quantity: 1 };
const destination = { country: "US", state: "NJ", zip: "07030" };
const created = {
  type: "order_created",
  orderNumber: "#2041",
  at: "2026-10-20T13:30:37.000Z",
  shipTo: destination,
  lines: [line],
};
const edited = {
  type: "order_edited",
  orderNumber: "#2041",
  at: "2026-10-20T13:48:37.000Z",
  addedLines: [{ sku: "NW-MULTI-30", quantity: 1 }],
};
const enrichedCreated = {
  ...created,
  shipTo: {
    ...destination,
    postalAssessment: { kind: "recognized", prefix: "070" },
  },
};

describe("OrderEventsSchema", () => {
  it("enriches destinations while preserving event data and existing SKU conversion", () => {
    const raw: unknown = JSON.parse(
      readFileSync(new URL("../../data/orders.json", import.meta.url), "utf8"),
    );
    const output = OrderEventsSchema.parse(raw);
    const expected = structuredClone(raw) as OrderEventsInput;
    for (const event of expected) {
      if (event.type !== "order_created") continue;
      if (event.orderNumber === "#2045") event.lines = [{ sku: "NW-MAG-90", quantity: 1 }];
      if (event.orderNumber === "#2033") event.shipTo.zip = "02134";
    }
    const sourceFields = output.map((event) => {
      if (event.type === "order_edited") return event;
      const { postalAssessment, ...shipTo } = event.shipTo;
      expect(postalAssessment).toBeDefined();
      return { ...event, shipTo };
    });
    expect(sourceFields).toEqual(expected);
    expect(raw).not.toEqual(output);
  });

  it("does not assemble, sort, or check relationships between events", () => {
    const input = [edited, created];
    expect(OrderEventsSchema.parse(input)).toEqual([edited, enrichedCreated]);
  });

  it("accepts an empty event stream", () => {
    expect(OrderEventsSchema.parse([])).toEqual([]);
  });

  it.each([created, null, "events"])("rejects a non-array root: %j", (input) => {
    expect(OrderEventsSchema.safeParse(input).success).toBe(false);
  });
});

describe("OrderEventSchema", () => {
  it.each([created, edited])("accepts a supported event variant: %j", (input) => {
    expect(OrderEventSchema.parse(input)).toEqual(
      input.type === "order_created" ? enrichedCreated : edited,
    );
  });

  it("normalizes line SKUs without expanding bundle identifiers", () => {
    const input = {
      ...created,
      lines: [
        { sku: "nw-mag-90", quantity: 1 },
        { sku: "NW-BNDL-ESS", quantity: 2 },
      ],
    };
    expect(OrderEventSchema.parse(input)).toEqual({
      ...enrichedCreated,
      lines: [
        { sku: "NW-MAG-90", quantity: 1 },
        { sku: "NW-BNDL-ESS", quantity: 2 },
      ],
    });
  });

  it("normalizes added-line SKUs in edit events", () => {
    const input = { ...edited, addedLines: [{ sku: "nw-multi-30", quantity: 1 }] };
    expect(OrderEventSchema.parse(input)).toEqual(edited);
  });

  it.each([
    { ...created, type: "order_deleted" },
    { orderNumber: "#2041", at: created.at, lines: [line] },
    { ...created, orderNumber: "" },
    { ...created, orderNumber: " \t\n" },
    { ...created, orderNumber: 2041 },
    { ...created, lines: [] },
    { ...edited, addedLines: [] },
    { type: "order_created", orderNumber: "#2041", at: created.at, lines: [line] },
    { type: "order_edited", orderNumber: "#2041", at: edited.at },
    { ...created, addedLines: [line] },
    { ...edited, lines: [line] },
    { ...edited, shipTo: destination },
    { ...created, extra: true },
    { ...edited, extra: true },
    { ...created, lines: [{ ...line, extra: true }] },
    { ...edited, addedLines: [{ ...line, extra: true }] },
  ])("rejects malformed or mixed event shapes: %j", (input) => {
    expect(OrderEventSchema.safeParse(input).success).toBe(false);
  });
});

describe("ShipToSchema", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    { raw: "07030", zip: "07030", postalAssessment: { kind: "recognized", prefix: "070" } },
    { raw: "07030-1834", zip: "07030-1834", postalAssessment: { kind: "recognized", prefix: "070" } },
    { raw: 2134, zip: "02134", postalAssessment: { kind: "recognized", prefix: "021" } },
    { raw: "M5V 2T6", zip: "M5V 2T6", postalAssessment: { kind: "unrecognized" } },
    { raw: "2134", zip: "2134", postalAssessment: { kind: "unrecognized" } },
    { raw: "0703", zip: "0703", postalAssessment: { kind: "unrecognized" } },
    { raw: " ", zip: " ", postalAssessment: { kind: "unrecognized" } },
    { raw: " 07030 ", zip: " 07030 ", postalAssessment: { kind: "unrecognized" } },
    { raw: "07030\n", zip: "07030\n", postalAssessment: { kind: "unrecognized" } },
    { raw: -2134, zip: "-2134", postalAssessment: { kind: "unrecognized" } },
    { raw: 2134.5, zip: "2134.5", postalAssessment: { kind: "unrecognized" } },
    { raw: 999, zip: "999", postalAssessment: { kind: "unrecognized" } },
    { raw: "", zip: "", postalAssessment: { kind: "missing" } },
    { raw: null, zip: "", postalAssessment: { kind: "missing" } },
    { raw: undefined, zip: "", postalAssessment: { kind: "missing" } },
  ])("produces string ZIP for $raw without changing source input", ({ raw, zip, postalAssessment }) => {
    const input = Object.freeze({ ...destination, zip: raw });
    const output = ShipToSchema.parse(input);
    expect(output).toEqual({ ...destination, zip, postalAssessment });
    expect(typeof output.zip).toBe("string");
    expect(input.zip).toBe(raw);
    expect(Object.hasOwn(input, "postalAssessment")).toBe(false);
    expect(output).not.toBe(input);
    expect(output.postalAssessment).not.toHaveProperty("value");
  });

  it("produces empty string for omitted ZIP without adding it to the source", () => {
    const input = Object.freeze({ country: "US", state: "NJ" });
    const output = ShipToSchema.parse(input);
    expect(output).toEqual({ ...input, zip: "", postalAssessment: { kind: "missing" } });
    expect(Object.hasOwn(output, "zip")).toBe(true);
    expect(Object.hasOwn(input, "zip")).toBe(false);
  });

  it.each(["CA", "ca", "us", " US "])(
    "bypasses US recognition for country %j without changing source fields", (country) => {
      const spy = vi.spyOn(zipNormalization, "normalizeUsZip");
      const input = Object.freeze({ country, state: "ON", zip: "M5V 2T6" });
      expect(ShipToSchema.parse(input)).toEqual({ ...input, postalAssessment: null });
      expect(spy).not.toHaveBeenCalled();
    },
  );

  it.each([
    { raw: 2134, zip: "2134" }, { raw: -1, zip: "-1" },
    { raw: 1.5, zip: "1.5" }, { raw: null, zip: "" },
    { raw: undefined, zip: "" }, { raw: " 07030 ", zip: " 07030 " },
  ])("represents outside-US ZIP $raw as text without US repair", ({ raw, zip }) => {
    const spy = vi.spyOn(zipNormalization, "normalizeUsZip");
    const input = Object.freeze({ country: "CA", state: "ON", zip: raw });
    expect(ShipToSchema.parse(input)).toEqual({ ...input, zip, postalAssessment: null });
    expect(input.zip).toBe(raw);
    expect(spy).not.toHaveBeenCalled();
  });

  it("adds empty output ZIP for an outside-US omission without mutating input", () => {
    const input = Object.freeze({ country: "CA", state: "ON" });
    expect(ShipToSchema.parse(input)).toEqual({ ...input, zip: "", postalAssessment: null });
    expect(Object.hasOwn(input, "zip")).toBe(false);
  });

  it.each(["NJ", "MA", "unknown", " ca "])(
    "does not infer or cross-check ZIP from state %j", (state) => {
      const input = { country: "US", state, zip: 2134 };
      expect(ShipToSchema.parse(input)).toEqual({
        ...input, zip: "02134",
        postalAssessment: { kind: "recognized", prefix: "021" },
      });
    },
  );

  it("classifies raw numeric input before string conversion and checks output ZIP/prefix", () => {
    const spy = vi.spyOn(zipNormalization, "normalizeUsZip");
    ShipToSchema.parse({ ...destination, zip: 2134 });
    expect(spy).toHaveBeenCalledExactlyOnceWith(2134);
    spy.mockReturnValueOnce({ zip: "07030", postalAssessment: { kind: "recognized", prefix: "021" } });
    const mismatch = ShipToSchema.safeParse(destination);
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ["postalAssessment", "prefix"] }),
      ]));
    }
    spy.mockReturnValueOnce({ zip: "0703", postalAssessment: { kind: "recognized", prefix: "070" } });
    expect(ShipToSchema.safeParse(destination).success).toBe(false);
    spy.mockReturnValueOnce({ zip: "not empty", postalAssessment: { kind: "missing" } });
    expect(ShipToSchema.safeParse(destination).success).toBe(false);
  });

  it("distinguishes raw inputs from string-only enriched outputs", () => {
    expectTypeOf<ShipToInput["zip"]>().toEqualTypeOf<string | number | null | undefined>();
    expectTypeOf<ShipToOutput["zip"]>().toEqualTypeOf<string>();
    expectTypeOf<"postalAssessment">().not.toMatchTypeOf<keyof ShipToInput>();
    expectTypeOf<ShipToOutput["postalAssessment"]>().toEqualTypeOf<PostalAssessmentOutput | null>();
    expect(RawShipToSchema.parse(destination)).toEqual(destination);
    expect(ShipToSchema.safeParse(ShipToSchema.parse(destination)).success).toBe(false);
  });

  it.each([true, {}, [], NaN, Infinity, -Infinity])(
    "rejects unsupported raw ZIP type/value %j before either country branch", (zip) => {
      for (const country of ["US", "CA"]) {
        expect(ShipToSchema.safeParse({ ...destination, country, zip }).success).toBe(false);
      }
    },
  );

  it.each([
    { ...destination, country: "" },
    { ...destination, state: " \t\n" },
    { ...destination, zip: true },
    { ...destination, zip: {} },
    { ...destination, zip: [] },
    { ...destination, extra: true },
    { ...destination, postalAssessment: { kind: "missing" } },
    { country: "CA", state: "ON", postalAssessment: null },
  ])("rejects malformed destination fields: %j", (input) => {
    expect(ShipToSchema.safeParse(input).success).toBe(false);
  });
});

describe("EventTimestampSchema", () => {
  it.each([created.at, "2026-10-20T10:30:37.000-03:00"])(
    "accepts an ISO timestamp with an explicit timezone: %j",
    (input) => {
      expect(EventTimestampSchema.parse(input)).toBe(input);
    },
  );

  it.each([
    "not a date",
    "2026-10-20",
    "2026-10-20T13:30:37",
    "2026-02-30T13:30:37.000Z",
    1792503037,
    null,
  ])("rejects invalid or timezone-free timestamps: %j", (input) => {
    expect(EventTimestampSchema.safeParse(input).success).toBe(false);
  });
});

describe("OrderLineSchema", () => {
  it("distinguishes source strings from canonical SKU outputs", () => {
    expectTypeOf<OrderLineInput["sku"]>().toEqualTypeOf<string>();
    expectTypeOf<OrderLineOutput["sku"]>().toEqualTypeOf<Sku>();
  });

  it.each(["1", 0, -1, 1.5, null, true])(
    "rejects invalid quantities without coercion: %j",
    (quantity) => {
      expect(OrderLineSchema.safeParse({ ...line, quantity }).success).toBe(false);
    },
  );

  it("uses the shared nonblank SKU contract", () => {
    expect(OrderLineSchema.safeParse({ ...line, sku: " \t\n" }).success).toBe(
      false,
    );
  });
});
