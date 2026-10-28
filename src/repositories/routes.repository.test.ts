import { afterEach, describe, expect, it, vi } from "vitest";
import { Writable } from "node:stream";
import type { RoutingResult } from "../domain/routing";
import { writeRoutes } from "./routes.repository";

afterEach(() => vi.restoreAllMocks());

describe("route output", () => {
  it("prints ordered warehouse zones and partner reasons with a final newline", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation((_chunk, encodingOrCallback, callback) => {
      const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
      complete?.();
      return true;
    });
    const routes: RoutingResult[] = [
      { orderNumber: "#2", kind: "warehouse", warehouseCode: "WH-GA", zone: 3 },
      { orderNumber: "#10", kind: "partner", reason: "outside-us" },
      { orderNumber: "#11", kind: "partner", reason: "insufficient-stock" },
    ];
    const before = structuredClone(routes);
    await writeRoutes(routes);
    expect(stdout).toHaveBeenCalledExactlyOnceWith("#2\tWH-GA\tzone=3\n#10\tPARTNER\toutside-us\n#11\tPARTNER\tinsufficient-stock\n", expect.any(Function));
    expect(routes).toEqual(before);
  });

  it("writes nothing for an empty result list", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await writeRoutes([]);
    expect(stdout).not.toHaveBeenCalled();
  });

  it("propagates output failures", async () => {
    const failure = new Error("stdout unavailable");
    vi.spyOn(process.stdout, "write").mockImplementation(() => { throw failure; });
    await expect(writeRoutes([{ orderNumber: "#1", kind: "partner", reason: "missing-zip" }])).rejects.toBe(failure);
  });

  it("does not resolve until stdout completes the write, including backpressure", async () => {
    let complete: ((error?: Error | null) => void) | undefined;
    vi.spyOn(process.stdout, "write").mockImplementation((_chunk, encodingOrCallback, callback) => {
      complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
      return false;
    });
    let settled = false;
    const pending = writeRoutes([{ orderNumber: "#1", kind: "partner", reason: "missing-zip" }])
      .then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(complete).toBeTypeOf("function");
    complete?.();
    await pending;
    expect(settled).toBe(true);
  });

  it("rejects failures delivered asynchronously by a real writable stream", async () => {
    const listeners = process.stdout.listenerCount("error");
    const failure = new Error("asynchronous write failure");
    const stream = new Writable({
      write(_chunk, _encoding, callback) { setImmediate(() => callback(failure)); },
    });
    // This stream emits separately from stdout; its callback still reaches the repository.
    stream.on("error", () => {});
    vi.spyOn(process.stdout, "write").mockImplementation((chunk, encodingOrCallback, callback) => {
      const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
      return stream.write(chunk, complete);
    });
    await expect(writeRoutes([{ orderNumber: "#1", kind: "partner", reason: "missing-zip" }]))
      .rejects.toBe(failure);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(process.stdout.listenerCount("error")).toBe(listeners);
  });
});
