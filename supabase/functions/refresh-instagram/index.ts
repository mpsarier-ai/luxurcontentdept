// LUXUR Calendar - Instagram Feed Refresh Edge Function
// Triggered by cron (every 30 min). Writes the real published feed into instagram_feed (id=1).
//
// Token model (post-2026 Instagram via Facebook Login):
//  - First run: exchanges IG_BOOTSTRAP_TOKEN (short-lived, from Graph API Explorer)
//    into a long-lived (~60d) token and stores it in integration_state(key='instagram').
//  - Every run: if the stored long-lived token is within 7 days of expiry, it is
//    re-exchanged (extends another ~60d). Fully self-healing, zero manual upkeep.
//
// Secrets required (Supabase project secrets):
//   SUPABASE_URL (auto), SUPABASE_SERVICE_ROLE_KEY, IG_APP_ID, IG_APP_SECRET, IG_BOOTSTRAP_TOKEN

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://nrpgtlcdvtesjbxpkxha.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IG_APP_ID = Deno.env.get("IG_APP_ID")!;
const IG_APP_SECRET = Deno.env.get("IG_APP_SECRET")!;
const IG_BOOTSTRAP_TOKEN = Deno.env.get("IG_BOOTSTRAP_TOKEN") || "";
const GRAPH = "https://graph.facebook.com/v21.0";

// === Supabase REST (service role: bypasses RLS) ===

const SB_HEADERS = {
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function sbGetState(): Promise<Record<string, unknown> | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/integration_state?key=eq.instagram&select=value`,
    { headers: SB_HEADERS },
  );
  if (!r.ok) throw new Error(`state read ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  return rows.length ? (rows[0].value as Record<string, unknown>) : null;
}

async function sbSetState(value: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/integration_state?on_conflict=key`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify([{ key: "instagram", value, updated_at: new Date().toISOString() }]),
  });
  if (!r.ok) throw new Error(`state write ${r.status}: ${await r.text()}`);
}

async function sbSetFeed(data: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/instagram_feed?on_conflict=id`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify([{ id: 1, data, updated_at: new Date().toISOString() }]),
  });
  if (!r.ok) throw new Error(`feed write ${r.status}: ${await r.text()}`);
}

// === Instagram Graph API ===

async function exchangeForLongLived(token: string): Promise<{ token: string; expiresAt: number }> {
  const url = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(IG_APP_ID)}` +
    `&client_secret=${encodeURIComponent(IG_APP_SECRET)}` +
    `&fb_exchange_token=${encodeURIComponent(token)}`;
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(`token exchange failed: ${JSON.stringify(d)}`);
  const expiresIn = Number(d.expires_in) || 5184000; // ~60d default
  return { token: d.access_token, expiresAt: Date.now() + expiresIn * 1000 };
}

async function resolveIgUser(token: string): Promise<{ id: string; username: string }> {
  const url = `${GRAPH}/me/accounts?fields=name,instagram_business_account{username}` +
    `&access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok) throw new Error(`me/accounts failed: ${JSON.stringify(d)}`);
  const page = (d.data || []).find((p: any) => p.instagram_business_account);
  if (!page) throw new Error("No Facebook Page with a connected Instagram Business account was found for this token.");
  const iba = page.instagram_business_account;
  return { id: iba.id, username: iba.username || "" };
}

async function fetchMedia(igUserId: string, token: string) {
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const url = `${GRAPH}/${igUserId}/media?fields=${fields}&limit=30` +
    `&access_token=${encodeURIComponent(token)}`;
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok) throw new Error(`media fetch failed: ${JSON.stringify(d)}`);
  return (d.data || []).map((m: any) => ({
    id: m.id,
    caption: m.caption || "",
    media_type: m.media_type || "IMAGE",
    media_url: m.media_url || "",
    thumbnail_url: m.thumbnail_url || "",
    permalink: m.permalink || "",
    timestamp: m.timestamp || "",
  }));
}

// === Handler ===

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

async function handler(): Promise<Response> {
  try {
    let state = (await sbGetState()) || {};
    let token = state.long_token as string | undefined;
    let expiresAt = Number(state.expires_at) || 0;
    let igUserId = state.ig_user_id as string | undefined;
    let username = (state.username as string) || "";
    let refreshed = false;

    // 1. Ensure we have a valid long-lived token
    if (!token) {
      if (!IG_BOOTSTRAP_TOKEN) {
        throw new Error("No stored token and IG_BOOTSTRAP_TOKEN secret is empty. Add the Graph API Explorer token as the IG_BOOTSTRAP_TOKEN secret once.");
      }
      const ex = await exchangeForLongLived(IG_BOOTSTRAP_TOKEN);
      token = ex.token; expiresAt = ex.expiresAt; refreshed = true;
    } else if (expiresAt - Date.now() < SEVEN_DAYS) {
      const ex = await exchangeForLongLived(token);
      token = ex.token; expiresAt = ex.expiresAt; refreshed = true;
    }

    // 2. Resolve the IG business account id (cache it)
    if (!igUserId) {
      const u = await resolveIgUser(token!);
      igUserId = u.id; username = u.username;
    }

    // 3. Fetch the real published feed
    const media = await fetchMedia(igUserId!, token!);

    // 4. Persist feed + token state
    await sbSetFeed({
      account: { username },
      media,
      fetched_at: new Date().toISOString(),
    });
    await sbSetState({
      long_token: token,
      expires_at: expiresAt,
      ig_user_id: igUserId,
      username,
      last_refresh: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        status: "ok",
        media_count: media.length,
        username,
        token_refreshed: refreshed,
        token_expires: new Date(expiresAt).toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("refresh-instagram error:", err);
    return new Response(
      JSON.stringify({ status: "error", error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

Deno.serve(handler);
