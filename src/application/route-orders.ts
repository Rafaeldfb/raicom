import { resolveOrderProducts } from "../domain/catalog";
import { reconstructCompleteOrders, sortOrdersByCreation } from "../domain/order";
import {
  applyWarehousePriority,
  checkPostalCoverage,
  findEligibleWarehouses,
  isUsDestination,
  prepareRoutingRun,
  publishRoutes,
  retainHighestOrderCover,
  retainLowestZone,
  type RoutingResult,
} from "../domain/routing";
import { reserveStock } from "../domain/warehouse";

export async function routeOrders(): Promise<RoutingResult[]> {
  const context = await prepareRoutingRun();
  const completeOrders = reconstructCompleteOrders(context.events);
  const orders = sortOrdersByCreation(completeOrders);
  const routes: RoutingResult[] = [];

  for (const order of orders) {
    // 1. Check country.
    if (!isUsDestination(order.shipTo)) {
      routes.push({
        orderNumber: order.orderNumber, kind: "partner", reason: "outside-us",
      });
      continue;
    }

    // 2. Check postal coverage using the accepted assessment.
    const coverage = checkPostalCoverage(order.shipTo.postalAssessment, context.zones);
    if (!coverage.covered) {
      routes.push({
        orderNumber: order.orderNumber, kind: "partner", reason: coverage.reason,
      });
      continue;
    }

    const products = resolveOrderProducts(order, context.catalog);

    // 3. Require enabled warehouses with stock for the entire order.
    const eligible = findEligibleWarehouses(context.warehouses, products);

    // 4. Retain the lowest zone, preserving an empty candidate list.
    const closest = retainLowestZone(eligible, coverage.prefix, context.zones);

    // 5. Retain the greatest minimum product cover.
    const mostCover = retainHighestOrderCover(closest, products);

    // 6. Resolve remaining ties in the required warehouse order.
    const selected = applyWarehousePriority(mostCover);

    // 7. Apply fallback when no warehouse can fulfill the order.
    if (selected === undefined) {
      routes.push({
        orderNumber: order.orderNumber, kind: "partner", reason: "insufficient-stock",
      });
      continue;
    }

    routes.push({
      orderNumber: order.orderNumber,
      kind: "warehouse",
      warehouseCode: selected.warehouse.code,
      zone: selected.zone,
    });
    context.warehouses = reserveStock(context.warehouses, selected.warehouse.code, products);
  }

  await publishRoutes(routes);
  return routes;
}
