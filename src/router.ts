import { routeOrders } from "./application/route-orders";

try {
  await routeOrders();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
