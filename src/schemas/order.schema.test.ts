import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EventTimestampSchema,
  OrderEventSchema,
  OrderEventsSchema,
  OrderLineSchema,
  ShipToSchema,
} from "./order.schema";

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

describe("OrderEventsSchema", () => {
  it("accepts the supplied event stream without changing it", () => {
    const raw: unknown = JSON.parse(
      readFileSync(new URL("../../data/orders.json", import.meta.url), "utf8"),
    );
    expect(OrderEventsSchema.parse(raw)).toEqual(raw);
  });

  it("does not assemble, sort, or check relationships between events", () => {
    const input = [edited, created];
    expect(OrderEventsSchema.parse(input)).toEqual(input);
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
    expect(OrderEventSchema.parse(input)).toEqual(input);
  });

  it("preserves lowercase SKUs and bundle identifiers without interpretation", () => {
    const input = {
      ...created,
      lines: [
        { sku: "nw-mag-90", quantity: 1 },
        { sku: "NW-BNDL-ESS", quantity: 2 },
      ],
    };
    expect(OrderEventSchema.parse(input)).toEqual(input);
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
  it.each(["07030", "07030-1834", "M5V 2T6", "", 2134, null])(
    "preserves raw ZIP representations without validating postal format: %j",
    (zip) => {
      const input = { ...destination, zip };
      expect(ShipToSchema.parse(input)).toEqual(input);
    },
  );

  it("keeps a missing ZIP representable without supplying a default", () => {
    const input = { country: "US", state: "NJ" };
    expect(ShipToSchema.parse(input)).toEqual(input);
  });

  it("preserves international destinations and supplied casing", () => {
    const input = { country: "ca", state: "ON", zip: "M5V 2T6" };
    expect(ShipToSchema.parse(input)).toEqual(input);
  });

  it.each([
    { ...destination, country: "" },
    { ...destination, state: " \t\n" },
    { ...destination, zip: true },
    { ...destination, zip: {} },
    { ...destination, zip: [] },
    { ...destination, extra: true },
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
