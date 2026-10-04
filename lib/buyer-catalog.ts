import type { CatalogProduct } from "./types";

export function filterCatalog(products: CatalogProduct[], query: string, category: string, sort: string) {
  const term = query.trim().toLocaleLowerCase("id-ID");
  return products.filter((product) => (category === "Semua" || product.type === category) &&
    (!term || `${product.name} ${product.organization} ${product.location}`.toLocaleLowerCase("id-ID").includes(term)))
    .sort((a, b) => sort === "murah" ? (a.minPrice ?? a.price) - (b.minPrice ?? b.price) : sort === "stok" ? b.available - a.available :
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
