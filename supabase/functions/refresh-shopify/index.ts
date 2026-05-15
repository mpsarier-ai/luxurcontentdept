// LUXUR Calendar - Shopify Refresh Edge Function
// Triggered by cron every 12h, refreshes shopify_data jsonb in calendars table.
// Auth flow: OAuth client_credentials grant against Shopify Admin API.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://nrpgtlcdvtesjbxpkxha.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SHOPIFY_CLIENT_ID = Deno.env.get("SHOPIFY_CLIENT_ID")!;
const SHOPIFY_CLIENT_SECRET = Deno.env.get("SHOPIFY_CLIENT_SECRET")!;
const SHOPIFY_SHOP_DOMAIN = Deno.env.get("SHOPIFY_SHOP_DOMAIN")!;
const SHOPIFY_API_VERSION = "2025-04";

const DOW_ABBR = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

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

async function shopifyQL(token: string, query: string) {
  const data = await shopifyGQL(token, `
    query($q: String!) {
      shopifyqlQuery(query: $q) {
        __typename
        ... on TableResponse {
          tableData {
            columns { name dataType }
            rowData
            unformattedData
          }
        }
        ... on ParseError {
          parseErrors { code message }
        }
      }
    }
  `, { q: query });
  if (data.shopifyqlQuery.__typename === "ParseError") {
    throw new Error(`ShopifyQL parse: ${JSON.stringify(data.shopifyqlQuery.parseErrors)}`);
  }
  return data.shopifyqlQuery.tableData;
}

async function getInventory(token: string, productGid: string) {
  const data = await shopifyGQL(token, `
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
                      quantities(names: ["available"]) {
                        name
                        quantity
                      }
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

function formatMoneyM(value: number): string {
  return `$${(value / 1_000_000).toFixed(2)}M`;
}
function formatMoneyMshort(value: number): string {
  return `$${(value / 1_000_000).toFixed(1)}M`;
}
function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DOW_ABBR[dt.getDay()]} ${d}`;
}
function inventoryClass(n: number): "ok" | "low" | "out" {
  if (n > 5) return "ok";
  if (n >= 1) return "low";
  return "out";
}
function shortName(title: string): string {
  return title
    .replace(/^JEAN\s+/i, '')
    .replace(/\s+(ANCHO|STRAIGHT|RECTO|RELAXED FIT|WIDE LEG FIT)\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function bogotaTimestamp(): string {
  const now = new Date();
  const bogota = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const yyyy = bogota.getUTCFullYear();
  const mm = String(bogota.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(bogota.getUTCDate()).padStart(2, '0');
  const hh = String(bogota.getUTCHours()).padStart(2, '0');
  const min = String(bogota.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} -05`;
}

// === MAIN ===

async function handler(_req: Request): Promise<Response> {
  const startTime = Date.now();
  try {
    // 1. Get Shopify token
    const shopifyToken = await getShopifyToken();

    // 2. Get active calendars
    const calendars = await rpcCall('rpc_get_active_calendars', {});
    if (!calendars || calendars.length === 0) {
      return new Response(JSON.stringify({ status: 'no active calendars' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Pull shared analytics data (sales + sellers, last 7 days)
    const [salesData, sellersData] = await Promise.all([
      shopifyQL(shopifyToken, "FROM sales SHOW gross_sales, net_sales, orders TIMESERIES day SINCE -7d UNTIL today"),
      shopifyQL(shopifyToken, "FROM sales SHOW gross_sales, orders GROUP BY product_title ORDER BY gross_sales DESC LIMIT 8 SINCE -7d UNTIL today"),
    ]);

    // Process sales rows
    const salesRows = salesData.rowData || [];
    let totalGross = 0, totalOrders = 0, maxValue = 0;
    let bestDay: { date: string; gross: number; orders: number } | null = null;
    for (const row of salesRows) {
      const date = row[0] as string;
      const gross = parseFloat(row[1] as string) || 0;
      const orders = parseInt(row[3] as string) || 0;
      totalGross += gross;
      totalOrders += orders;
      if (gross > maxValue) {
        maxValue = gross;
        bestDay = { date, gross, orders };
      }
    }

    const dailyChart = salesRows.map((row: unknown[]) => {
      const gross = parseFloat(row[1] as string) || 0;
      return {
        label: dayLabel(row[0] as string),
        value: formatMoneyMshort(gross),
        height_pct: maxValue > 0 ? Math.round((gross / maxValue) * 100) : 0,
        peak: gross === maxValue,
      };
    });

    const sellersRows = sellersData.rowData || [];
    const topSellers = sellersRows.slice(0, 6).map((r: unknown[]) => ({
      name: shortName(r[0] as string),
      sales: formatMoneyM(parseFloat(r[1] as string) || 0),
      orders: parseInt(r[2] as string) || 0,
    }));

    const topSellerRow = sellersRows[0];
    const topSeller = topSellerRow ? {
      name: shortName(topSellerRow[0] as string).split(' ').slice(0, 3).join(' '),
      sales: formatMoneyM(parseFloat(topSellerRow[1] as string) || 0),
      orders: parseInt(topSellerRow[2] as string) || 0,
    } : null;

    const ts = bogotaTimestamp();
    const results: Array<{ id: string; status: string }> = [];

    // 4. For each calendar, build inventory + write
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
              const size = v.title;
              let totalAvailable = 0;
              for (const lvlEdge of v.inventoryItem.inventoryLevels.edges) {
                const availQty = lvlEdge.node.quantities.find((q: { name: string }) => q.name === 'available');
                if (availQty) totalAvailable += availQty.quantity || 0;
              }
              sizeMap[size] = (sizeMap[size] || 0) + totalAvailable;
            }
            inventory[fp.gid] = Object.entries(sizeMap).map(([size, avail]) => ({
              size,
              available: avail,
              class: inventoryClass(avail),
            }));
          } catch (err) {
            console.error(`Inventory ${fp.gid}:`, err);
          }
        }

        const shopifyData = {
          timestamp: ts,
          data_range: "Últimos 7 días",
          metrics: {
            gross_sales: formatMoneyM(totalGross),
            gross_sales_sub: "COP · últimos 7 días",
            orders: totalOrders,
            orders_sub: `avg ${Math.round(totalOrders / 7)}/día`,
            best_day_label: bestDay ? dayLabel(bestDay.date) : "—",
            best_day_sub: bestDay ? `${formatMoneyM(bestDay.gross)} · ${bestDay.orders} órdenes` : "—",
            top_seller_name: topSeller ? topSeller.name : "—",
            top_seller_sub: topSeller ? `${topSeller.sales} · ${topSeller.orders} órdenes` : "—",
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

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    return new Response(JSON.stringify({
      active_calendars: calendars.length,
      results,
      duration_s: duration,
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Handler error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(handler);
