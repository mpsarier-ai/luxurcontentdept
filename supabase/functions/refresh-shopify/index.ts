// LUXUR Calendar - Shopify Refresh Edge Function
// Triggered by cron every 12h. Refreshes shopify_data jsonb in calendars table.
// Auth: OAuth client_credentials grant. Analytics: aggregated from orders (ShopifyQL removed from Admin API).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://nrpgtlcdvtesjbxpkxha.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SHOPIFY_CLIENT_ID = Deno.env.get("SHOPIFY_CLIENT_ID")!;
const SHOPIFY_CLIENT_SECRET = Deno.env.get("SHOPIFY_CLIENT_SECRET")!;
const SHOPIFY_SHOP_DOMAIN = Deno.env.get("SHOPIFY_SHOP_DOMAIN")!;
const SHOPIFY_API_VERSION = "2025-04";

const DOW_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// === SHOPIFY ===

async function getShopifyToken(): Promise<string> {
  const r = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!r.ok) throw new Error(`OAuth ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.access_token;
}

async function shopifyGQL(token: string, query: string, variables: Record<string, unknown> = {}) {
  const r = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const data = await r.json();
  if (data.errors) throw new Error(`GraphQL: ${JSON.stringify(data.errors)}`);
  return data.data;
}

// Fetch paid orders since a date (ISO). Aggregates in code.
async function fetchOrders(token: string, sinceISO: string) {
  const orders: Array<{
    id: string;
    createdAt: string;
    total: number;
    lineItems: Array<{ title: string; amount: number; quantity: number }>;
  }> = [];
  let cursor: string | null = null;
  let hasNext = true;
  let pages = 0;
  while (hasNext && pages < 20) {
    pages++;
    const data: any = await shopifyGQL(token, `
      query($cursor: String) {
        orders(first: 250, after: $cursor, query: "created_at:>=${sinceISO}", sortKey: CREATED_AT) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              createdAt
              currentTotalPriceSet { shopMoney { amount } }
              lineItems(first: 50) {
                edges { node { title quantity originalTotalSet { shopMoney { amount } } } }
              }
            }
          }
        }
      }
    `, { cursor });
    const conn = data.orders;
    for (const e of conn.edges) {
      const n = e.node;
      const lineItems = n.lineItems.edges.map((le: any) => ({
        title: le.node.title,
        amount: parseFloat(le.node.originalTotalSet?.shopMoney?.amount || "0"),
        quantity: parseInt(le.node.quantity ?? "0", 10) || 0,
      }));
      // "gross sales" = suma de lineItems a precio original (antes de descuentos/
      // impuestos/envio), para que coincida con el gross_sales de Shopify Analytics
      const gross = lineItems.reduce((s: number, li: any) => s + li.amount, 0);
      orders.push({ id: n.id, createdAt: n.createdAt, total: gross, lineItems });
    }
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }
  return orders;
}

async function getInventory(token: string, productGid: string) {
  const data: any = await shopifyGQL(token, `
    query($id: ID!) {
      product(id: $id) {
        title
        variants(first: 20) {
          edges {
            node {
              title
              inventoryItem {
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      quantities(names: ["available"]) { name quantity }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, { id: productGid });
  return data.product;
}

// Fetch ALL active products with inventory by size (paginated). Compact output.
async function fetchCatalog(token: string) {
  const products: Array<{
    gid: string;
    title: string;
    total: number;
    createdAt: string;
    publishedAt: string | null;
    sizes: Array<{ size: string; available: number; price?: number }>;
  }> = [];
  let cursor: string | null = null;
  let hasNext = true;
  let pages = 0;
  while (hasNext && pages < 15) {
    pages++;
    const data: any = await shopifyGQL(token, `
      query($cursor: String) {
        products(first: 100, after: $cursor, query: "status:active", sortKey: TITLE) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              createdAt
              publishedAt
              variants(first: 20) {
                edges {
                  node {
                    title
                    price
                    inventoryItem {
                      inventoryLevels(first: 10) {
                        edges { node { quantities(names: ["available"]) { name quantity } } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `, { cursor });
    const conn = data.products;
    for (const e of conn.edges) {
      const n = e.node;
      const sizeMap: Record<string, { available: number; price?: number }> = {};
      for (const ve of n.variants.edges) {
        const v = ve.node;
        let avail = 0;
        for (const lvl of v.inventoryItem.inventoryLevels.edges) {
          const q = lvl.node.quantities.find((x: any) => x.name === 'available');
          if (q) avail += q.quantity || 0;
        }
        const price = v.price ? parseFloat(v.price) : undefined;
        if (!sizeMap[v.title]) sizeMap[v.title] = { available: 0, price };
        sizeMap[v.title].available += avail;
        if (price && !sizeMap[v.title].price) sizeMap[v.title].price = price;
      }
      const sizes = Object.entries(sizeMap).map(([size, v]) => ({ size, available: v.available, price: v.price }));
      const total = sizes.reduce((s, x) => s + x.available, 0);
      products.push({
        gid: n.id, title: n.title, total,
        createdAt: n.createdAt, publishedAt: n.publishedAt || n.createdAt,
        sizes,
      });
    }
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }
  return products;
}

// === ShopifyQL · Plus only — sales nativos por producto y variante ===
// Devuelve { rows: any[], err: string|null }. Si la tienda no es Plus, err viene poblado.
// Soporta dos formas de respuesta del schema (tableData.rowData 2D-array vs rows objects)
async function runShopifyQL(token: string, q: string): Promise<{ rows: any[]; err: string | null }> {
  try {
    const data: any = await shopifyGQL(token, `
      query RunQL($q: String!) {
        shopifyqlQuery(query: $q) {
          parseErrors { message code }
          tableData { columns { name dataType } rowData }
        }
      }
    `, { q });
    const res = data?.shopifyqlQuery;
    if (!res) return { rows: [], err: "no_response" };
    if (res.parseErrors && res.parseErrors.length) {
      return { rows: [], err: res.parseErrors.map((p: any) => p.message || p.code).join('; ') };
    }
    const cols: { name: string }[] = res.tableData?.columns || [];
    const rowData: any[] = res.tableData?.rowData || [];
    const rows = rowData.map((row: any) => {
      // rowData puede venir como array (posicional) u objeto (keyed)
      if (Array.isArray(row)) {
        const obj: Record<string, any> = {};
        cols.forEach((c, i) => { obj[c.name] = row[i]; });
        return obj;
      }
      return row;
    });
    return { rows, err: null };
  } catch (err) {
    return { rows: [], err: (err as Error).message };
  }
}

// === SUPABASE ===

async function rpcCall(fnName: string, body: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (r.status >= 400) throw new Error(`RPC ${fnName}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : await r.json();
}

// === HELPERS ===

function fmtM(v: number): string { return `$${(v / 1_000_000).toFixed(2)}M`; }
function fmtMshort(v: number): string { return `$${(v / 1_000_000).toFixed(1)}M`; }
function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DOW_ABBR[dt.getUTCDay()]} ${d}`;
}
function invClass(n: number): "ok" | "low" | "out" {
  if (n > 5) return "ok";
  if (n >= 1) return "low";
  return "out";
}
function shortName(title: string): string {
  return title
    .replace(/^JEAN\s+/i, '')
    .replace(/\b(ANCHO|STRAIGHT|RECTO|RELAXED FIT|WIDE LEG FIT)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function bogotaTimestamp(): string {
  const b = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return `${b.getUTCFullYear()}-${String(b.getUTCMonth()+1).padStart(2,'0')}-${String(b.getUTCDate()).padStart(2,'0')} ${String(b.getUTCHours()).padStart(2,'0')}:${String(b.getUTCMinutes()).padStart(2,'0')} -05`;
}
// Calendar date (YYYY-MM-DD) of an order timestamp, in Bogota time (UTC-5).
// Shopify createdAt is ISO8601; Date() parses any offset to epoch, then we shift -5h.
function bogotaDate(iso: string): string {
  const t = new Date(iso).getTime() - 5 * 60 * 60 * 1000;
  const b = new Date(t);
  return `${b.getUTCFullYear()}-${String(b.getUTCMonth()+1).padStart(2,'0')}-${String(b.getUTCDate()).padStart(2,'0')}`;
}
// Bogota "today" minus N days, as YYYY-MM-DD
function daysAgoISO(n: number): string {
  const b = new Date(Date.now() - 5 * 60 * 60 * 1000);
  b.setUTCDate(b.getUTCDate() - n);
  return `${b.getUTCFullYear()}-${String(b.getUTCMonth()+1).padStart(2,'0')}-${String(b.getUTCDate()).padStart(2,'0')}`;
}
// Shift any YYYY-MM-DD by deltaDays (can be negative)
function shiftISO(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
}

// === MAIN ===

async function handler(_req: Request): Promise<Response> {
  const startTime = Date.now();
  try {
    const shopifyToken = await getShopifyToken();

    const calendars = await rpcCall('rpc_get_active_calendars', {});
    if (!calendars || calendars.length === 0) {
      return new Response(JSON.stringify({ status: 'no active calendars' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Per-calendar window = the 7 days BEFORE the calendar's start_date.
    // Global fetch from the earliest needed date (también cubre rolling -7d y -60d para el catálogo).
    const todayISO = daysAgoISO(0);
    const rollingStart = daysAgoISO(7);   // últimos 7 días (días 7..1 atrás)
    const prevWeekStart = daysAgoISO(14); // los 7 días antes (días 14..8 atrás)
    const rolling30Start = daysAgoISO(30);  // últimos 30 días
    const prev30Start = daysAgoISO(60);     // los 30 días antes
    let earliest = prev30Start;             // 60 días atrás cubre todo
    for (const cal of calendars) {
      const ps = shiftISO(cal.start_date, -7);
      if (ps < earliest) earliest = ps;
    }
    const orders = await fetchOrders(shopifyToken, earliest);

    // Aggregate any [startISO .. endISO] window from the fetched orders
    function buildWindow(startISO: string, days: number = 7){
      const endISO = shiftISO(startISO, days - 1);
      const dayMap: Record<string, { gross: number; orders: number }> = {};
      const prodMap: Record<string, { gross: number; units: number; orderIds: Set<string> }> = {};
      for (const o of orders) {
        const day = bogotaDate(o.createdAt);
        if (day < startISO || day > endISO) continue;
        if (!dayMap[day]) dayMap[day] = { gross: 0, orders: 0 };
        dayMap[day].gross += o.total;
        dayMap[day].orders += 1;
        for (const li of o.lineItems) {
          if (!prodMap[li.title]) prodMap[li.title] = { gross: 0, units: 0, orderIds: new Set() };
          prodMap[li.title].gross += li.amount;
          prodMap[li.title].units += li.quantity || 0;
          prodMap[li.title].orderIds.add(o.id);
        }
      }
      const series: Array<{ date: string; gross: number; orders: number }> = [];
      for (let i = 0; i < days; i++) {
        const d = shiftISO(startISO, i);
        const e = dayMap[d] || { gross: 0, orders: 0 };
        series.push({ date: d, gross: e.gross, orders: e.orders });
      }
      let totalGross = 0, totalOrders = 0, maxV = 0;
      let bestDay: { date: string; gross: number; orders: number } | null = null;
      for (const s of series) {
        totalGross += s.gross; totalOrders += s.orders;
        if (s.gross > maxV) { maxV = s.gross; bestDay = s; }
      }
      const dailyChart = series.map(s => ({
        label: dayLabel(s.date),
        value: fmtMshort(s.gross),
        height_pct: maxV > 0 ? Math.round((s.gross / maxV) * 100) : 0,
        peak: s.gross === maxV && maxV > 0,
      }));
      const sellersSorted = Object.entries(prodMap)
        .map(([title, v]) => ({ title, gross: v.gross, units: v.units, orders: v.orderIds.size }))
        .sort((a, b) => b.gross - a.gross);
      const topSellers = sellersSorted.slice(0, 6).map(s => ({
        name: shortName(s.title), sales: fmtM(s.gross), orders: s.orders,
      }));
      return { startISO, endISO, prodMap, series, totalGross, totalOrders, bestDay, dailyChart, topSellers, top: sellersSorted[0] };
    }

    // Catalog enriched: ventanas 7d, prev-7d, 30d, prev-30d (units + gross) +
    // ShopifyQL nativo de 30d y 90d, por producto y por variante (si la tienda es Plus)
    let catalogCount = 0;
    let shopifyqlStatus: { ok: boolean; err: string | null } = { ok: false, err: null };
    try {
      const rolling = buildWindow(rollingStart, 7);
      const prev = buildWindow(prevWeekStart, 7);
      const rolling30 = buildWindow(rolling30Start, 30);
      const prev30 = buildWindow(prev30Start, 30);
      const catalog = await fetchCatalog(shopifyToken);
      catalogCount = catalog.length;

      // === ShopifyQL nativo (solo Plus) ===
      // Si falla (no Plus), el dashboard usa el agregado de órdenes como fallback.
      const [sales30Res, sales90Res, variantSales30Res] = await Promise.all([
        runShopifyQL(shopifyToken,
          `FROM sales SHOW net_items_sold GROUP BY product_title SINCE -30d UNTIL today LIMIT 200`),
        runShopifyQL(shopifyToken,
          `FROM sales SHOW net_items_sold GROUP BY product_title SINCE -90d UNTIL today LIMIT 200`),
        runShopifyQL(shopifyToken,
          `FROM sales SHOW net_items_sold GROUP BY product_title, product_variant_title SINCE -30d UNTIL today LIMIT 1000`),
      ]);
      // Si AL MENOS una query funcionó, marcamos como OK; si todas fallaron, error
      const allFailed = !!sales30Res.err && !!sales90Res.err && !!variantSales30Res.err;
      shopifyqlStatus = allFailed
        ? { ok: false, err: sales30Res.err || sales90Res.err || variantSales30Res.err || 'unknown' }
        : { ok: true, err: null };
      if (!shopifyqlStatus.ok) {
        console.warn('ShopifyQL no disponible (probable no-Plus):', shopifyqlStatus.err);
      }

      // Mapas product_title -> units
      const native30Map: Record<string, number> = {};
      for (const r of sales30Res.rows) {
        const t = r.product_title; if (!t) continue;
        native30Map[t] = parseInt(String(r.net_items_sold ?? "0"), 10) || 0;
      }
      const native90Map: Record<string, number> = {};
      for (const r of sales90Res.rows) {
        const t = r.product_title; if (!t) continue;
        native90Map[t] = parseInt(String(r.net_items_sold ?? "0"), 10) || 0;
      }
      // Mapa product_title -> variant_title -> units
      const variantNative30Map: Record<string, Record<string, number>> = {};
      for (const r of variantSales30Res.rows) {
        const t = r.product_title; const v = r.product_variant_title;
        if (!t || v == null) continue;
        if (!variantNative30Map[t]) variantNative30Map[t] = {};
        variantNative30Map[t][v] = parseInt(String(r.net_items_sold ?? "0"), 10) || 0;
      }

      // Día de referencia para "antigüedad" en Bogotá
      const todayMs = Date.parse(daysAgoISO(0) + 'T00:00:00-05:00');

      for (const p of catalog as any[]) {
        const sold = rolling.prodMap[p.title];
        const soldPrev = prev.prodMap[p.title];
        const sold30 = rolling30.prodMap[p.title];
        const soldPrev30 = prev30.prodMap[p.title];

        // === Ventana 7d (manual, desde órdenes) ===
        p.sales7d = sold ? Math.round(sold.gross) : 0;
        p.units7d = sold ? sold.units : 0;
        p.orders7d = sold ? sold.orderIds.size : 0;
        p.salesPrev7d = soldPrev ? Math.round(soldPrev.gross) : 0;
        p.unitsPrev7d = soldPrev ? soldPrev.units : 0;
        p.ordersPrev7d = soldPrev ? soldPrev.orderIds.size : 0;

        // === Ventana 30d ===
        // Preferimos ShopifyQL nativo si disponible; fallback a agregación manual.
        const manual30 = sold30 ? sold30.units : 0;
        p.units30d_manual = manual30;
        p.units30d_native = native30Map[p.title] ?? null;
        p.units30d = (p.units30d_native ?? manual30); // canónico
        p.units90d_native = native90Map[p.title] ?? null;
        p.units90d = (p.units90d_native ?? null); // 90d solo si ShopifyQL disponible

        // gross + prev (de órdenes, ya disponible)
        p.sales30d = sold30 ? Math.round(sold30.gross) : 0;
        p.orders30d = sold30 ? sold30.orderIds.size : 0;
        p.salesPrev30d = soldPrev30 ? Math.round(soldPrev30.gross) : 0;
        p.unitsPrev30d = soldPrev30 ? soldPrev30.units : 0;
        p.ordersPrev30d = soldPrev30 ? soldPrev30.orderIds.size : 0;

        // === Antigüedad (días desde publishedAt) ===
        const pubMs = p.publishedAt ? Date.parse(p.publishedAt) : Date.parse(p.createdAt);
        p.daysSincePublished = isNaN(pubMs) ? 999 : Math.max(0, Math.floor((todayMs - pubMs) / 86400000));

        // === Per-variant 30d sales (nativo si disponible) ===
        const varMap = variantNative30Map[p.title] || {};
        if (Array.isArray(p.sizes)) {
          for (const sz of p.sizes) {
            sz.units30d = varMap[sz.size] ?? 0;
          }
        }
      }

      // Status del refresh — el dashboard infiere la fuente revisando units30d_native !== null
      await rpcCall('rpc_update_catalog', { data: catalog });
    } catch (err) {
      console.error('Catalog refresh failed:', (err as Error).message);
    }

    const ts = bogotaTimestamp();
    const results: Array<{ id: string; status: string }> = [];

    for (const cal of calendars) {
      try {
        // This calendar's window = 7 days before its start_date
        const winStart = shiftISO(cal.start_date, -7);
        const w = buildWindow(winStart);
        const rangeLabel = `${w.startISO} a ${w.endISO}`;
        const isFuture = w.endISO >= todayISO;

        const featured = cal.featured_products || [];
        const inventory: Record<string, Array<{ size: string; available: number; class: string }>> = {};
        for (const fp of featured) {
          try {
            const product = await getInventory(shopifyToken, fp.gid);
            if (!product) continue;
            const sizeMap: Record<string, number> = {};
            for (const edge of product.variants.edges) {
              const v = edge.node;
              let avail = 0;
              for (const lvl of v.inventoryItem.inventoryLevels.edges) {
                const q = lvl.node.quantities.find((x: any) => x.name === 'available');
                if (q) avail += q.quantity || 0;
              }
              sizeMap[v.title] = (sizeMap[v.title] || 0) + avail;
            }
            inventory[fp.gid] = Object.entries(sizeMap).map(([size, a]) => ({
              size, available: a, class: invClass(a),
            }));
          } catch (err) {
            console.error(`Inv ${fp.gid}:`, (err as Error).message);
          }
        }

        const shopifyData = {
          timestamp: ts,
          data_range: `Semana anterior (${rangeLabel})${isFuture ? ' · parcial' : ''}`,
          metrics: {
            gross_sales: fmtM(w.totalGross),
            gross_sales_sub: `COP · ${rangeLabel}`,
            orders: w.totalOrders,
            orders_sub: `avg ${Math.round(w.totalOrders / 7)}/día`,
            best_day_label: w.bestDay && w.bestDay.gross > 0 ? dayLabel(w.bestDay.date) : "—",
            best_day_sub: w.bestDay && w.bestDay.gross > 0 ? `${fmtM(w.bestDay.gross)} · ${w.bestDay.orders} órdenes` : "—",
            top_seller_name: w.top ? shortName(w.top.title).split(' ').slice(0, 3).join(' ') : "—",
            top_seller_sub: w.top ? `${fmtM(w.top.gross)} · ${w.top.orders} órdenes` : "—",
          },
          top_sellers: w.topSellers,
          daily_chart: w.dailyChart,
          inventory,
        };

        await rpcCall('rpc_update_shopify_data', { cid: cal.id, data: shopifyData });
        results.push({ id: cal.id, status: 'updated' });
      } catch (err) {
        results.push({ id: cal.id, status: `error: ${(err as Error).message}` });
      }
    }

    return new Response(JSON.stringify({
      active_calendars: calendars.length,
      orders_analyzed: orders.length,
      catalog_products: catalogCount,
      results,
      duration_s: ((Date.now() - startTime) / 1000).toFixed(1),
    }, null, 2), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Handler error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(handler);
