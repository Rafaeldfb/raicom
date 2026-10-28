import { loadWarehouses } from "../lib/loader/Loader";
import { WarehousesSchema, type WarehousesOutput } from "../schemas/warehouse.schema";

export async function readWarehouses(): Promise<WarehousesOutput> {
  return WarehousesSchema.parse(await loadWarehouses());
}
