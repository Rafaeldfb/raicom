import { loadOrders } from "../lib/loader/Loader";
import { OrderEventsSchema, type OrderEventsOutput } from "../schemas/order.schema";

export async function readOrderEvents(): Promise<OrderEventsOutput> {
  return OrderEventsSchema.parse(await loadOrders());
}
