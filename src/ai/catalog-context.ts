import { loadCatalog, loadTransport, loadCityTours } from '../catalog/catalog';

export async function buildCatalogContext(): Promise<string> {
  const [products, transports, cityTours] = await Promise.all([
    loadCatalog(),
    loadTransport(),
    loadCityTours()
  ]);

  let text = 'AVAILABLE CATALOG:\n\n';

  // Group products by category
  const productsByCategory = new Map<string, typeof products[number][]>();
  for (const p of products) {
    const arr = productsByCategory.get(p.category) || [];
    arr.push(p);
    productsByCategory.set(p.category, arr);
  }

  for (const [category, items] of productsByCategory.entries()) {
    text += `### Category: ${category}\n`;
    for (const p of items) {
      let line = `- [${p.id}] ${p.product} (Tour: ${p.tour}, Option: ${p.transferOption}) | Adult: ${(p.costAed / 100).toFixed(2)} AED`;
      if (p.childCostAed) line += ` | Child: ${(p.childCostAed / 100).toFixed(2)} AED`;
      if (p.toddlerCostAed) line += ` | Toddler: ${(p.toddlerCostAed / 100).toFixed(2)} AED`;
      text += line + '\n';
    }
    text += '\n';
  }

  if (transports.length > 0) {
    text += `### Transport\n`;
    for (const t of transports) {
      text += `- [${t.id}] ${t.route} (${t.vehicleSize}) by ${t.supplier} | Rate: ${(t.rateAed / 100).toFixed(2)} AED\n`;
    }
    text += '\n';
  }

  if (cityTours.length > 0) {
    text += `### City Tours\n`;
    for (const c of cityTours) {
      text += `- [${c.id}] ${c.name} (${c.type}) | Rate: ${(c.rateAed / 100).toFixed(2)} AED\n`;
    }
    text += '\n';
  }

  return text;
}
