// LUXUR · refresh-channels
// Venta neta sin IVA por día y canal desde ShopifyQL → sales_channel_daily.
// Corre cada hora (pg_cron). Backfill: POST {"days": 120}.
// Canales: tienda = Point of Sale · online = Online Store · falabella = Falabella
//          whatsapp = Draft Orders + Shopify Mobile + conectores (Claude / CLI)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHOPIFY_CLIENT_ID = Deno.env.get("SHOPIFY_CLIENT_ID")!;
const SHOPIFY_CLIENT_SECRET = Deno.env.get("SHOPIFY_CLIENT_SECRET")!;
const SHOPIFY_SHOP_DOMAIN = Deno.env.get("SHOPIFY_SHOP_DOMAIN")!;
const SHOPIFY_API_VERSION = "2025-04";

function channelOf(name: string): string {
  const n = (name || "").toLowerCase();
  if (n === "point of sale") return "tienda";
  if (n === "online store") return "online";
  if (n.includes("falabella")) return "falabella";
  if (n === "draft orders" || n.startsWith("shopify mobile") || n.includes("connector")) return "whatsapp";
  return "otro";
}

async function getShopifyToken(): Promise<string> {
  const r = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  if (!r.ok) throw new Error(`OAuth ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function shopifyQL(token: string, q: string): Promise<Record<string, unknown>[]> {
  const r = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: `query RunQL($q: String!) { shopifyqlQuery(query: $q) { parseErrors tableData { columns { name } rows } } }`,
      variables: { q },
    }),
  });
  const data = await r.json();
  if (data.errors) throw new Error(`GraphQL: ${JSON.stringify(data.errors)}`);
  const res = data.data?.shopifyqlQuery;
  if (res?.parseErrors?.length) throw new Error(`ShopifyQL: ${res.parseErrors.join("; ")}`);
  const cols: { name: string }[] = res?.tableData?.columns || [];
  return (res?.tableData?.rows || []).map((row: unknown) => {
    if (!Array.isArray(row)) return row as Record<string, unknown>;
    const o: Record<string, unknown> = {};
    cols.forEach((c, i) => (o[c.name] = row[i]));
    return o;
  });
}

Deno.serve(async (req: Request) => {
  const t0 = Date.now();
  try {
    let days = 3;
    try { const b = await req.json(); if (b?.days) days = Math.min(400, Math.max(1, parseInt(b.days, 10))); } catch { /* sin body */ }
    const token = await getShopifyToken();
    const rows = await shopifyQL(token,
      `FROM sales SHOW orders, net_sales, net_items_sold GROUP BY sales_channel TIMESERIES day SINCE -${days}d UNTIL today`);

    const agg: Record<string, { day: string; channel: string; orders: number; net: number; units: number }> = {};
    for (const r of rows) {
      const day = String(r.day ?? "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      const channel = channelOf(String(r.sales_channel ?? ""));
      const k = `${day}|${channel}`;
      if (!agg[k]) agg[k] = { day, channel, orders: 0, net: 0, units: 0 };
      agg[k].orders += parseInt(String(r.orders ?? "0"), 10) || 0;
      agg[k].net += parseFloat(String(r.net_sales ?? "0")) || 0;
      agg[k].units += parseInt(String(r.net_items_sold ?? "0"), 10) || 0;
    }
    const payload = Object.values(agg).map((a) => ({ ...a, net: Math.round(a.net * 100) / 100 }));

    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_update_sales_channel_daily`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_rows: payload }),
    });
    if (rpc.status >= 400) throw new Error(`RPC ${rpc.status}: ${await rpc.text()}`);
    const n = await rpc.json();
    return new Response(JSON.stringify({ ok: true, days, rows: n, ms: Date.now() - t0 }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("refresh-channels:", (err as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
