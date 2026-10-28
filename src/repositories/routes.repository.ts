import type { RoutingResult } from "../domain/routing";

// One stdout line per result; see tests/fixtures/cli-routing/expected.txt for the format.
export async function writeRoutes(routes: RoutingResult[]): Promise<void> {
  const lines = routes.map((route) => route.kind === "warehouse"
    ? `${route.orderNumber}\t${route.warehouseCode}\tzone=${route.zone}`
    : `${route.orderNumber}\tPARTNER\t${route.reason}`,
  );
  if (lines.length === 0) return;
  await new Promise<void>((resolve, reject) => {
    const output = process.stdout;
    const cleanup = () => output.removeListener("error", onError);
    const onError = (error: Error) => { cleanup(); reject(error); };
    output.once("error", onError);
    try {
      output.write(`${lines.join("\n")}\n`, (error) => {
        if (error) {
          // Node can emit an error after this callback; Bun can report it only here.
          setImmediate(cleanup);
          reject(error);
        } else {
          cleanup();
          resolve();
        }
      });
    } catch (error: unknown) {
      cleanup();
      reject(error);
    }
  });
}
