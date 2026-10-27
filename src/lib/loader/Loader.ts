import { readFile } from "node:fs/promises";

const disallowedKeys = new Set(["__proto__", "constructor", "prototype"]);

// Guard untrusted JSON before Zod parsing; direct schema calls skip this step.
export function parseJson(text: string): unknown {
  return JSON.parse(text, (key: string, value: unknown): unknown => {
    if (disallowedKeys.has(key)) {
      throw new Error(`Disallowed JSON key: ${key}`);
    }
    return value;
  }) as unknown;
}

type JsonReader = (path: URL) => Promise<string>;

const readJsonText: JsonReader = (path) => readFile(path, "utf8");

export function createJsonLoader(
  path: URL,
  readText: JsonReader = readJsonText,
): () => Promise<unknown> {
  let cached: Promise<unknown> | undefined;

  return async () => {
    if (!cached) {
      cached = readText(path)
        .then(parseJson)
        .catch((error: unknown) => {
          cached = undefined;
          throw error;
        });
    }

    // Keep caller mutations from changing the cached input for later runs.
    return structuredClone(await cached);
  };
}

export const loadCatalog = createJsonLoader(
  new URL("../../../data/catalog.json", import.meta.url),
);

export const loadOrders = createJsonLoader(
  new URL("../../../data/orders.json", import.meta.url),
);

export const loadWarehouses = createJsonLoader(
  new URL("../../../data/warehouses.json", import.meta.url),
);

export const loadZones = createJsonLoader(
  new URL("../../../data/zones.json", import.meta.url),
);
