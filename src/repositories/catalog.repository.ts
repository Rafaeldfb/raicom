import { loadCatalog } from "../lib/loader/Loader";
import { CatalogSchema, type CatalogOutput } from "../schemas/catalog.schema";

export async function readCatalog(): Promise<CatalogOutput> {
  return CatalogSchema.parse(await loadCatalog());
}
