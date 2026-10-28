import type { CatalogOutput } from "../schemas/catalog.schema";
import type { OrderLineOutput } from "../schemas/order.schema";
import type { Order } from "./order";

// Expand one-level bundles into stock demand without changing the ordered lines.
export function resolveOrderProducts(
  order: Order,
  catalog: CatalogOutput,
): OrderLineOutput[] {
  const products = new Set(catalog.products.map((product) => product.sku));
  const bundles = new Map(catalog.bundles.map((bundle) => [bundle.sku, bundle]));
  const quantities = new Map<OrderLineOutput["sku"], number>();
  const addQuantity = (sku: OrderLineOutput["sku"], quantity: number) => {
    quantities.set(sku, (quantities.get(sku) ?? 0) + quantity);
  };

  for (const line of order.lines) {
    const bundle = bundles.get(line.sku);
    if (bundle) {
      for (const component of bundle.components) {
        if (!products.has(component.sku)) {
          throw new Error(`Unsupported bundle component: ${component.sku} in ${bundle.sku}`);
        }
        addQuantity(component.sku, line.quantity * component.quantity);
      }
      continue;
    }
    if (!products.has(line.sku)) {
      throw new Error("resolveOrderProducts: unknown SKU handling not implemented");
    }
    addQuantity(line.sku, line.quantity);
  }
  return [...quantities].map(([sku, quantity]) => ({ sku, quantity }));
}
