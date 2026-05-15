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
    lineItems: Array<{ title: string; amount: number }>;
  }> = [];
  let cursor: string | null = null;
  let hasNext = true;
  let pages = 0;
  while (hasNext && pages < 10) {
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
                edges { node { title originalTotalSet { shopMoney { amount } } } }
              }
            }
          }
        }
      }
    `, { cursor });
    const conn = data.orders;
    for (const e of conn.edges) {
      const n = e.node;
      orders.push({
        id: n.id,
        createdAt: n.createdAt,
        total: parseFloat(n.currentTotalPriceSet?.shopMoney?.amount || "0"),
        lineItems: n.lineItems.edges.map((le: any) => ({
          title: le.node.title,
          amount: parseFloat(le.node.originalTotalSet?.shopMoney?.amount || "0"),
        })),
      });
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
    sizes: Array<{ size: string; available: number }>;
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
              variants(first: 20) {
                edges {
                  node {
                    title
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
      const sizeMap: Record<string, number> = {};
      for (const ve of n.variants.edges) {
        const v = ve.node;
        let avail = 0;
        for (const lvl of v.inventoryItem.inventoryLevels.edges) {
          const q = lvl.node.quantities.find((x: any) => x.name === 'available');
          if (q) avail += q.quantity || 0;
        }
        sizeMap[v.title] = (sizeMap[v.title] || 0) + avail;
      }
      const sizes = Object.entries(sizeMap).map(([size, available]) => ({ size, available }));
      const total = sizes.reduce((s, x) => s + x.available, 0);
      products.push({ gid: n.id, title: n.title, total, sizes });
    }
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }
  return products;
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
// Bogota "today" minus N days, as YYYY-MM-DD
function daysAgoISO(n: number): string {
  const b = new Date(Date.now() - 5 * 60 * 60 * 1000);
  b.setUTCDate(b.getUTCDate() - n);
  return `${b.getUTCFullYear()}-${String(b.getUTCMonth()+1).padStart(2,'0')}-${String(b.getUTCDate()).padStart(2,'0')}`;
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

    // Refresh full product catalog (for per-piece product picker + inventory filter)
    let catalogCount = 0;
    try {
      const catalog = await fetchCatalog(shopifyToken);
      catalogCount = catalog.length;
      await rpcCall('rpc_update_catalog', { data: catalog });
    } catch (err) {
      console.error('Catalog refresh failed:', (err as Error).message);
    }

    // Pull orders for last 7 days (shared across calendars)
    const since = daysAgoISO(7);
    const orders = await fetchOrders(shopifyToken, since);

    // Aggregate by day
    const dayMap: Record<string, { gross: number; orders: number }> = {};
    const prodMap: Record<string, { gross: number; orderIds: Set<string> }> = {};
    for (const o of orders) {
      const day = o.createdAt.slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { gross: 0, orders: 0 };
      dayMap[day].gross += o.total;
      dayMap[day].orders += 1;
      for (const li of o.lineItems) {
        if (!prodMap[li.title]) prodMap[li.title] = { gross: 0, orderIds: new Set() };
        prodMap[li.title].gross += li.amount;
        prodMap[li.title].orderIds.add(o.id);
      }
    }

    // Build 7-day series (oldest -> newest)
    const series: Array<{ date: string; gross: number; orders: number }> = [];
    for (let i = 7; i >= 1; i--) {
      const d = daysAgoISO(i);
      const e = dayMap[d] || { gross: 0, orders: 0 };
      series.push({ date: d, gross: e.gross, orders: e.orders });
    }
    let totalGross = 0, totalOrders = 0, maxV = 0;
    let bestDay: { date: string; gross: number; orders: number } | null = null;
    for (const s of series) {
      totalGross += s.gross;
      totalOrders += s.orders;
      if (s.gross > maxV) { maxV = s.gross; bestDay = s; }
    }
    const dailyChart = series.map(s => ({
      label: dayLabel(s.date),
      value: fmtMshort(s.gross),
      height_pct: maxV > 0 ? Math.round((s.gross / maxV) * 100) : 0,
      peak: s.gross === maxV && maxV > 0,
    }));

    // Top sellers
    const sellersSorted = Object.entries(prodMap)
      .map(([title, v]) => ({ title, gross: v.gross, orders: v.orderIds.size }))
      .sort((a, b) => b.gross - a.gross);
    const topSellers = sellersSorted.slice(0, 6).map(s => ({
      name: shortName(s.title),
      sales: fmtM(s.gross),
      orders: s.orders,
    }));
    const top = sellersSorted[0];

    const ts = bogotaTimestamp();
    const results: Array<{ id: string; status: string }> = [];

    for (const cal of calendars) {
      try {
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
          data_range: "Últimos 7 días",
          metrics: {
            gross_sales: fmtM(totalGross),
            gross_sales_sub: "COP · últimos 7 días",
            orders: totalOrders,
            orders_sub: `avg ${Math.round(totalOrders / 7)}/día`,
            best_day_label: bestDay ? dayLabel(bestDay.date) : "—",
            best_day_sub: bestDay ? `${fmtM(bestDay.gross)} · ${bestDay.orders} órdenes` : "—",
            top_seller_name: top ? shortName(top.title).split(' ').slice(0, 3).join(' ') : "—",
            top_seller_sub: top ? `${fmtM(top.gross)} · ${top.orders} órdenes` : "—",
          },
          top_sellers: topSellers,
          daily_chart: dailyChart,
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
