import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CatalogSchema } from "../../schemas/catalog.schema";
import { OrderEventsSchema } from "../../schemas/order.schema";
import { WarehousesSchema } from "../../schemas/warehouse.schema";
import { ZonesSchema } from "../../schemas/zones.schema";
import {
  createJsonLoader,
  loadCatalog,
  loadOrders,
  loadWarehouses,
  loadZones,
  parseJson,
} from "./Loader";

describe("parseJson", () => {
  it.each([
    ['{"__proto__": {}}', "__proto__"],
    ['{"nested": {"constructor": {}}}', "constructor"],
    ['[{"items": [{"prototype": 1}]}]', "prototype"],
    ['{"__\\u0070roto__": true}', "__proto__"],
  ])("rejects a reserved key in JSON: %s", (text, key) => {
    expect(() => parseJson(text)).toThrow(`Disallowed JSON key: ${key}`);
  });

  it("preserves ordinary values, including reserved words in strings", () => {
    const text = '{"name":"__proto__","values":["constructor","prototype"]}';
    expect(parseJson(text)).toEqual({
      name: "__proto__",
      values: ["constructor", "prototype"],
    });
  });

  it("reports malformed JSON", () => {
    expect(() => parseJson("{")).toThrow(SyntaxError);
  });
});

describe("createJsonLoader", () => {
  const path = new URL("file:///example.json");
  const schema = z.strictObject({
    name: z.string(),
    values: z.array(z.number()),
  });

  it("shares one read across concurrent calls and protects cached input", async () => {
    const readText = vi.fn(async () => '{"name":"example","values":[1]}');
    const load = createJsonLoader(path, readText);

    const [firstRaw, secondRaw] = await Promise.all([load(), load()]);
    expect(readText).toHaveBeenCalledTimes(1);
    expect(readText).toHaveBeenCalledWith(path);
    expect(firstRaw).toEqual(secondRaw);
    expect(firstRaw).not.toBe(secondRaw);

    if (
      typeof firstRaw !== "object" ||
      firstRaw === null ||
      !("values" in firstRaw) ||
      !Array.isArray(firstRaw.values)
    ) {
      throw new Error("Expected test data to contain an array of values");
    }
    firstRaw.values.push(2);
    expect(await load()).toEqual({ name: "example", values: [1] });
    expect(secondRaw).toEqual({ name: "example", values: [1] });
    expect(readText).toHaveBeenCalledTimes(1);
  });

  it("retries after a read failure", async () => {
    const readText = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("read failed"))
      .mockResolvedValueOnce('{"name":"example","values":[]}');
    const load = createJsonLoader(path, readText);

    await expect(load()).rejects.toThrow("read failed");
    await expect(load()).resolves.toEqual({ name: "example", values: [] });
    expect(readText).toHaveBeenCalledTimes(2);
  });

  it("leaves structural validation to the consumer", async () => {
    const raw = { name: 1, values: [] };
    const readText = vi.fn(async () => JSON.stringify(raw));
    const load = createJsonLoader(path, readText);

    const loaded = await load();
    expect(loaded).toEqual(raw);
    expect(schema.safeParse(loaded).success).toBe(false);
  });

  it("retries after JSON parsing fails", async () => {
    const readText = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("{")
      .mockResolvedValueOnce('{"name":"example","values":[]}');
    const load = createJsonLoader(path, readText);

    await expect(load()).rejects.toBeInstanceOf(SyntaxError);
    await expect(load()).resolves.toEqual({ name: "example", values: [] });
    expect(readText).toHaveBeenCalledTimes(2);
  });

  it("retries after a disallowed key is detected", async () => {
    const readText = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('{"name":"example","values":[],"__proto__":{}}')
      .mockResolvedValueOnce('{"name":"example","values":[]}');
    const load = createJsonLoader(path, readText);

    await expect(load()).rejects.toThrow("Disallowed JSON key: __proto__");
    await expect(load()).resolves.toEqual({ name: "example", values: [] });
    expect(readText).toHaveBeenCalledTimes(2);
  });

  const cases: Array<{
    name: string;
    text: string;
  }> = [
    {
      name: "catalog",
      text: '{"products":[],"bundles":[],"__proto__":{}}',
    },
    {
      name: "orders",
      text: '[{"type":"order_edited","orderNumber":"#1","at":"2026-10-20T13:00:00Z","addedLines":[{"sku":"NW-1","quantity":1}],"__proto__":{}}]',
    },
    {
      name: "warehouses",
      text: '[{"code":"WH-NJ","city":"Edison, NJ","enabled":true,"inventory":{"__proto__":"invalid"}}]',
    },
    {
      name: "zones",
      text: '{"_note":"zones","__proto__":"invalid"}',
    },
  ];

  it.each(cases)("guards $name before schema validation", async ({ text }) => {
    const load = createJsonLoader(path, vi.fn(async () => text));
    await expect(load()).rejects.toThrow("Disallowed JSON key: __proto__");
  });
});

describe("dataset loaders", () => {
  it("derives fixture assessments without changing raw events or the loader cache", async () => {
    const raw = await loadOrders();
    const before = structuredClone(raw);
    const events = OrderEventsSchema.parse(raw);
    const cases = [
      {
        orderNumber: "#2033", zip: "02134",
        postalAssessment: { kind: "recognized", prefix: "021" },
      },
      {
        orderNumber: "#2039", zip: "07030-1834",
        postalAssessment: { kind: "recognized", prefix: "070" },
      },
      { orderNumber: "#2037", zip: "M5V 2T6", postalAssessment: null },
      { orderNumber: "#2046", zip: "", postalAssessment: { kind: "missing" } },
      {
        orderNumber: "#2042", zip: "96815",
        postalAssessment: { kind: "recognized", prefix: "968" },
      },
    ];
    for (const { orderNumber, zip, postalAssessment } of cases) {
      expect(events.find((event) => event.orderNumber === orderNumber)).toEqual(
        expect.objectContaining({ shipTo: expect.objectContaining({ zip, postalAssessment }) }),
      );
    }
    for (const event of events) {
      if (event.type === "order_created") {
        expect(typeof event.shipTo.zip).toBe("string");
        if (event.shipTo.postalAssessment !== null) {
          expect(event.shipTo.postalAssessment).not.toHaveProperty("value");
        }
      }
    }
    expect(raw).toEqual(before);
    expect(await loadOrders()).toEqual(before);
    expect(JSON.stringify(before)).not.toContain('"postalAssessment"');

    const zones = ZonesSchema.parse(await loadZones());
    for (const map of Object.values(zones)) {
      if (typeof map !== "string") expect(map).not.toHaveProperty("968");
    }
  });

  it("loads the four datasets for separate schema validation", async () => {
    const [rawCatalog, rawOrders, rawWarehouses, rawZones] = await Promise.all([
      loadCatalog(),
      loadOrders(),
      loadWarehouses(),
      loadZones(),
    ]);

    const catalog = CatalogSchema.parse(rawCatalog);
    const orders = OrderEventsSchema.parse(rawOrders);
    const warehouses = WarehousesSchema.parse(rawWarehouses);
    const zones = ZonesSchema.parse(rawZones);
    expect(catalog.products).toHaveLength(3);
    expect(catalog.bundles).toHaveLength(1);
    expect(orders).toHaveLength(27);
    expect(orders.find((event) => event.orderNumber === "#2045")).toEqual(
      expect.objectContaining({ lines: [{ sku: "NW-MAG-90", quantity: 1 }] }),
    );
    expect(rawOrders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderNumber: "#2045",
          lines: [{ sku: "nw-mag-90", quantity: 1 }],
        }),
      ]),
    );
    expect(warehouses).toHaveLength(4);
    expect(zones["WH-NJ"]).toEqual(expect.objectContaining({ "021": 3 }));
  });
});
