import type { OrderLineOutput } from "../schemas/order.schema";
import type { WarehousesOutput } from "../schemas/warehouse.schema";

// Products have been aggregated by resolveOrderProducts before selection and reservation.
export function reserveStock(
  warehouses: WarehousesOutput,
  warehouseCode: string,
  products: OrderLineOutput[],
): WarehousesOutput {
  const selected = warehouses.find((warehouse) => warehouse.code === warehouseCode);
  if (!selected?.enabled || products.some((product) =>
    (selected.inventory[product.sku]?.available ?? 0) < product.quantity,
  )) {
    throw new Error("Cannot reserve stock: selected warehouse cannot fulfill the order");
  }

  const updated = structuredClone(warehouses);
  const warehouse = updated.find((item) => item.code === warehouseCode)!;
  for (const product of products) {
    warehouse.inventory[product.sku]!.available -= product.quantity;
  }
  return updated;
}
