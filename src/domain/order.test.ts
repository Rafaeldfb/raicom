import { describe, expect, it } from "vitest";
import { OrderEventsSchema, type OrderEventsInput } from "../schemas/order.schema";
import { reconstructCompleteOrders, sortOrdersByCreation } from "./order";

const creation = (orderNumber: string, at = "2026-10-20T13:00:00.000Z") => ({
  type: "order_created" as const, orderNumber, at,
  shipTo: { country: "US", state: "NJ", zip: "07030" },
  lines: [{ sku: "nw-vitd-60", quantity: 1 }],
});
const edit = (at: string, quantity = 2) => ({
  type: "order_edited" as const, orderNumber: "#1", at,
  addedLines: [{ sku: "NW-VITD-60", quantity }],
});

describe("order reconstruction", () => {
  it("collects creations and eligible edits regardless of arrival order", () => {
    const events = OrderEventsSchema.parse([
      edit("2026-10-20T13:18:00.000Z"), creation("#2", "2026-10-20T13:01:00.000Z"), creation("#1"),
      edit("2026-10-20T13:35:00.000Z", 100), edit("2026-10-20T13:20:00.000Z", 3),
    ]);
    const before = structuredClone(events);
    const complete = reconstructCompleteOrders(events);
    expect(complete).toHaveLength(2);
    const order = complete.find((item) => item.orderNumber === "#1")!;
    expect(order.lines.map((line) => line.quantity)).toEqual([1, 2, 3]);
    expect(order.createdAt).toBe("2026-10-20T13:00:00.000Z");
    expect(order.shipTo.postalAssessment).toEqual({ kind: "recognized", prefix: "070" });
    expect(events).toEqual(before);
    order.lines[0]!.quantity = 999;
    order.shipTo.zip = "changed";
    expect(events).toEqual(before);
  });

  it.each([
    ["2026-10-20T12:59:59.999Z", false],
    ["2026-10-20T13:00:00.000Z", true],
    ["2026-10-20T13:30:00.000Z", true],
    ["2026-10-20T13:30:00.001Z", false],
  ])("uses the inclusive creation-to-30-minute window: %s", (at, included) => {
    const events = OrderEventsSchema.parse([creation("#1"), edit(at)]);
    expect(reconstructCompleteOrders(events)[0]!.lines).toHaveLength(included ? 2 : 1);
  });

  it("compares instants across timestamp offsets", () => {
    const events = OrderEventsSchema.parse([creation("#1"), edit("2026-10-20T10:30:00.000-03:00")]);
    expect(reconstructCompleteOrders(events)[0]!.lines).toHaveLength(2);
  });

  it.each([
    ["2026-10-20T12:59:59.999999Z", false],
    ["2026-10-20T13:00:00.000001Z", true],
    ["2026-10-20T13:30:00.000000Z", true],
    ["2026-10-20T13:30:00.000001Z", false],
  ])("preserves accepted fractional precision at the edit-window boundary: %s", (at, included) => {
    const events = OrderEventsSchema.parse([creation("#1", "2026-10-20T13:00:00.000000Z"), edit(at)]);
    expect(reconstructCompleteOrders(events)[0]!.lines).toHaveLength(included ? 2 : 1);
  });

  it.each([
    ["2026-10-20T13:00:00.000899Z", false],
    ["2026-10-20T13:00:00.000900Z", true],
    ["2026-10-20T13:30:00.000900Z", true],
    ["2026-10-20T13:30:00.000901Z", false],
    ["2026-10-20T10:30:00.000900-03:00", true],
  ])("retains the creation timestamp's fraction when measuring thirty minutes: %s", (at, included) => {
    const events = OrderEventsSchema.parse([creation("#1", "2026-10-20T13:00:00.000900Z"), edit(at)]);
    expect(reconstructCompleteOrders(events)[0]!.lines).toHaveLength(included ? 2 : 1);
  });

  it("sorts sub-millisecond creation times precisely across offsets and fractional lengths", () => {
    const events = OrderEventsSchema.parse([
      creation("later", "2026-10-20T13:00:00.000900Z"),
      creation("earlier", "2026-10-20T10:00:00.000100-03:00"),
      creation("last", "2026-10-20T13:00:00.1Z"),
    ]);
    expect(sortOrdersByCreation(reconstructCompleteOrders(events)).map((order) => order.orderNumber))
      .toEqual(["earlier", "later", "last"]);
  });

  it("does not truncate unusually long accepted fractions or distinguish equivalent trailing zeros", () => {
    const events = OrderEventsSchema.parse([
      creation("later", "2026-10-20T13:00:00.123456789123456789002Z"),
      creation("earlier", "2026-10-20T13:00:00.123456789123456789001Z"),
      creation("equal", "2026-10-20T13:00:00.1234567891234567890010Z"),
    ]);
    expect(sortOrdersByCreation(reconstructCompleteOrders(events)).map((order) => order.orderNumber))
      .toEqual(["earlier", "equal", "later"]);
  });

  it("sorts by creation time without mutating the input order list", () => {
    const events = OrderEventsSchema.parse([
      creation("#2", "2026-10-20T13:01:00.000Z"), creation("#10"),
    ]);
    const orders = reconstructCompleteOrders(events);
    expect(sortOrdersByCreation(orders).map((order) => order.orderNumber)).toEqual(["#10", "#2"]);
    expect(orders.map((order) => order.orderNumber)).toEqual(["#2", "#10"]);
  });

  it("handles an empty stream", () => {
    expect(reconstructCompleteOrders([])).toEqual([]);
    expect(sortOrdersByCreation([])).toEqual([]);
  });

  it.each<OrderEventsInput>([
    [creation("#1"), creation("#1")],
    [edit("2026-10-20T13:18:00.000Z")],
  ])("leaves unsupported event relationships explicit: %j", (...events) => {
    expect(() => reconstructCompleteOrders(OrderEventsSchema.parse(events))).toThrow("not implemented");
  });
});
