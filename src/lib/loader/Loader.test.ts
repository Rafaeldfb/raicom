import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createJsonLoader,
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
