// Apple Wallet · servicio web de la tarjeta de sellos LUXUR (se actualiza sola).
// Base (webServiceURL): https://nrpgtlcdvtesjbxpkxha.supabase.co/functions/v1/wallet-ws
//   GET    /pass?t={token}                                         → descarga el pase (iPhone) o redirige a la tarjeta
//   POST   /v1/devices/{dev}/registrations/{pti}/{serial}           → registra un iPhone (Apple)
//   GET    /v1/devices/{dev}/registrations/{pti}?passesUpdatedSince → seriales que cambiaron (Apple)
//   DELETE /v1/devices/{dev}/registrations/{pti}/{serial}           → quita el registro (Apple)
//   GET    /v1/passes/{pti}/{serial}                                → pase actualizado (Apple)
//   POST   /v1/log                                                  → errores que reporta el iPhone
//   POST   /push {serial}                                           → avisa por APNs a los iPhones de esa tarjeta
//   GET    /push-test                                               → prueba la conexión TLS con APNs
// La llave y el certificado del pase viven en Vault (ruleta_pass_secrets, solo service_role).

import forge from "npm:node-forge@1.3.1";
import { zipSync, strToU8 } from "npm:fflate@0.8.2";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import http2 from "node:http2";

const URL_BASE = "https://nrpgtlcdvtesjbxpkxha.supabase.co/functions/v1/wallet-ws";
const PTI = "pass.com.luxurjeans.ruleta";
const TEAM = "L87D2G2PS2";
const ASSETS = "https://ops.luxurjeans.com/wallet";
const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
const PAGE = (t: string) => `https://ops.luxurjeans.com/sellos/${encodeURIComponent(t)}`;

const ICONS: Record<string, string> = {
  "icon.png": "iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAIAAADZ8fBYAAAAX0lEQVR4XmOUkZFhoAFgooGZIDBqLgSMhgNR4RDj53tp44ZLGzfMa20lKUWOhi9R4Us2GA3foRm+LETGuImO9qWNG5AV106atHHvPlzaaZUeGEfrt9H6AgnQKp0NNXMBhRIOc59i39MAAAAASUVORK5CYII=",
  "icon@2x.png": "iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAIAAABu2d1/AAAApUlEQVR4Xu3ZvQnDMBBAYdtkDHUCFQHvkzls8BD5GSO906X3Bi7caZeQLhCSwuIVgvcNcJwf1xi1IYSmHl09q765Lsm6JOuSrEuyLsm6JOuSDoXD75dzn9LnkC3n0zAWjv3FYyBZl2RdknVJ1iVZl2RdknVJ1iVZl1T6a/ntGOP6mP/vPF1vz2XZ8V0eA8m6pNZXS5C3S7Iuybok65KsS7IuybqkF0jyDY/Rk6tDAAAAAElFTkSuQmCC",
  "icon@3x.png": "iVBORw0KGgoAAAANSUhEUgAAAFcAAABXCAIAAAD+qk47AAABCElEQVR4Xu3csQnCQBhAYSMuETiucSIH0cYpdAEzhoKdfQawt8kkEjAgwbtDjFW+12vkuP9/r1CrEMJi9ixnfwI9TsEpDLgL7oK78I6JMBEmwkSMsRfsBXvBXrAXPmE72o62o+1oO9qOKTiCIwZWyVsyBbGur80p9U6Prttsd1M851dMhIlQTapJNakm1ZSDKZmSKZmSKZmSKZmyhF7QC3pBL+gFvaAX9EIJvaAX9IJe0At6QS/ohRL//f5CnnWM98u59AnH7A/HW9t++6o8qkk1qSbVpJpUU4rKPw/4zf0LveAuuAt6QS/ohRQcwREcwREcwREckYMpmZIpmZIpmZIpmbKEXuh5AgBuDbhy1lnpAAAAAElFTkSuQmCC",
};

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const binToBytes = (bin: string) => Uint8Array.from(bin, (c) => c.charCodeAt(0));
const bytesToBin = (u8: Uint8Array) => { let s = ""; for (const b of u8) s += String.fromCharCode(b); return s; };
const sha1 = (u8: Uint8Array) => { const md = forge.md.sha1.create(); md.update(bytesToBin(u8)); return md.digest().toHex(); };
const cop = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const fecha = (d: string) => new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });

let secrets: { key: string; cert: string; wwdr: string } | null = null;
async function getSecrets() {
  if (!secrets) {
    const { data, error } = await svc.rpc("ruleta_pass_secrets");
    if (error || !data) throw new Error("secrets: " + (error?.message ?? "vacío"));
    secrets = data;
  }
  return secrets!;
}

const strips = new Map<string, Uint8Array>();
async function strip(n: number) {
  const out: Record<string, Uint8Array> = {};
  for (const suf of ["", "@2x", "@3x"]) {
    const k = `strip-${n}${suf}.png`;
    if (!strips.has(k)) {
      const r = await fetch(`${ASSETS}/${k}`);
      if (!r.ok) throw new Error("strip " + k + " " + r.status);
      strips.set(k, new Uint8Array(await r.arrayBuffer()));
    }
    out[`strip${suf}.png`] = strips.get(k)!;
  }
  return out;
}

type Tarjeta = { id: string; token: string; nombre: string; wallet_auth: string; updated_at: string };
async function tarjetaPorSerial(serial: string): Promise<Tarjeta | null> {
  if (!serial.startsWith("sellos-")) return null;
  const { data } = await svc.from("sellos_tarjetas").select("id,token,nombre,wallet_auth,updated_at").eq("token", serial.slice(7)).maybeSingle();
  return data as Tarjeta | null;
}

async function buildPass(t: Tarjeta) {
  const { data: s } = await anon.rpc("sellos_estado", { p_token: t.token });
  const n = Math.max(0, Math.min(10, s?.sellos ?? 0));
  const premio = (s?.premios ?? [])[0];
  const pass = {
    formatVersion: 1, passTypeIdentifier: PTI, teamIdentifier: TEAM,
    serialNumber: "sellos-" + t.token, authenticationToken: t.wallet_auth, webServiceURL: URL_BASE,
    organizationName: "LUXUR", description: "Tarjeta de sellos LUXUR", logoText: "LUXUR",
    backgroundColor: "rgb(238,205,204)", foregroundColor: "rgb(28,28,28)", labelColor: "rgb(58,46,46)",
    barcodes: [{ format: "PKBarcodeFormatQR", message: `https://ops.luxurjeans.com/caja/sellos?t=${t.token}`, messageEncoding: "iso-8859-1" }],
    storeCard: {
      headerFields: [{ key: "h", label: "SELLOS", value: `${n}/10` }],
      secondaryFields: premio
        ? [{ key: "premio", label: "JEAN GRATIS", value: `Hasta ${cop(premio.valor)}`, changeMessage: "¡Ganaste un jean gratis! %@" }]
        : [{ key: "sellos", label: "TUS SELLOS", value: `${n} de 10`, changeMessage: "Llevas %@ jeans en LUXUR" },
           { key: "faltan", label: "TE FALTAN", value: `${10 - n}` }],
      auxiliaryFields: [
        { key: "nombre", label: "CLIENTA", value: t.nombre },
        { key: "vence", label: "VENCE", value: s?.vence ? fecha(s.vence) : "Desde tu 1er jean" },
      ],
      backFields: [
        { key: "ver", label: "Tu tarjeta", value: PAGE(t.token), dataDetectorTypes: ["PKDataDetectorTypeLink"] },
        { key: "reglas", label: "Cómo funciona", value: "Cada jean que compras en LUXUR suma un sello. Al sello 10 te regalamos el jean de menor precio de esos 10. Tienes 10 meses desde tu primer sello; si no llegas a 10, la tarjeta vuelve a cero. Muestra este código en caja con cada compra." },
      ],
    },
  };
  const files: Record<string, Uint8Array> = { "pass.json": strToU8(JSON.stringify(pass)) };
  for (const [k, b] of Object.entries(ICONS)) files[k] = b64ToBytes(b);
  Object.assign(files, await strip(premio ? 10 : n));
  const manifest: Record<string, string> = {};
  for (const [k, b] of Object.entries(files)) manifest[k] = sha1(b);
  const manifestBytes = strToU8(JSON.stringify(manifest));
  const sec = await getSecrets();
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(bytesToBin(manifestBytes));
  const cert = forge.pki.certificateFromPem(sec.cert);
  p7.addCertificate(cert);
  p7.addCertificate(forge.pki.certificateFromPem(sec.wwdr));
  p7.addSigner({ key: forge.pki.privateKeyFromPem(sec.key), certificate: cert, digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [{ type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest }, { type: forge.pki.oids.signingTime, value: new Date() }] });
  p7.sign({ detached: true });
  const signature = binToBytes(forge.asn1.toDer(p7.toAsn1()).getBytes());
  return zipSync({ ...files, "manifest.json": manifestBytes, signature }, { level: 6 });
}

const pkpassResponse = (bytes: Uint8Array, t: Tarjeta) => new Response(bytes, { headers: {
  "Content-Type": "application/vnd.apple.pkpass", "Content-Disposition": `attachment; filename="sellos-luxur.pkpass"`,
  "Last-Modified": new Date(t.updated_at).toUTCString(), "Cache-Control": "no-store" } });

// ---- APNs (certificado del pase, HTTP/2) ----
async function apnsPush(token: string): Promise<{ status: number; body: string }> {
  const sec = await getSecrets();
  return await new Promise((resolve) => {
    const session = http2.connect("https://api.push.apple.com:443", { cert: sec.cert, key: sec.key });
    session.on("error", (e: Error) => resolve({ status: 0, body: "session: " + e.message }));
    const req = session.request({ ":method": "POST", ":path": `/3/device/${token}`, "apns-topic": PTI, "apns-push-type": "background", "content-type": "application/json" });
    let status = 0, body = "";
    req.on("response", (h: Record<string, unknown>) => { status = Number(h[":status"]); });
    req.on("data", (c: Uint8Array) => { body += new TextDecoder().decode(c); });
    req.on("end", () => { session.close(); resolve({ status, body }); });
    req.on("error", (e: Error) => { session.close(); resolve({ status: 0, body: "req: " + e.message }); });
    req.end("{}");
    setTimeout(() => { try { session.close(); } catch { /* */ } resolve({ status: 0, body: "timeout" }); }, 10000);
  });
}

function authOk(req: Request, t: Tarjeta | null) {
  return !!t && req.headers.get("authorization") === `ApplePass ${t.wallet_auth}`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/wallet-ws/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  try {
    // Descarga desde la página de la clienta
    if (req.method === "GET" && parts[0] === "pass") {
      const tok = url.searchParams.get("t") || "";
      const apple = /iPhone|iPad|iPod|Macintosh/i.test(req.headers.get("user-agent") || "") || url.searchParams.get("force") === "1";
      const t = await tarjetaPorSerial("sellos-" + tok);
      if (!t || !apple) return Response.redirect(PAGE(tok), 302);
      return pkpassResponse(await buildPass(t), t);
    }

    // Aviso interno: alguien sumó o canjeó sellos
    if (req.method === "POST" && parts[0] === "push") {
      const { serial } = await req.json();
      const { data: regs } = await svc.from("wallet_registrations").select("push_token").eq("serial", serial);
      const results = [];
      for (const r of regs ?? []) results.push(await apnsPush(r.push_token));
      return Response.json({ sent: results.length, results });
    }
    if (req.method === "GET" && parts[0] === "push-test") {
      return Response.json(await apnsPush("0000000000000000000000000000000000000000000000000000000000000000"));
    }

    if (parts[0] !== "v1") return new Response("not found", { status: 404 });

    if (req.method === "POST" && parts[1] === "log") {
      console.log("wallet log", await req.text());
      return new Response(null, { status: 200 });
    }

    // /v1/devices/{dev}/registrations/{pti}[/{serial}]
    if (parts[1] === "devices" && parts[3] === "registrations") {
      const dev = parts[2], pti = parts[4], serial = parts[5];
      if (pti !== PTI) return new Response(null, { status: 404 });

      if (req.method === "GET" && !serial) {
        const since = url.searchParams.get("passesUpdatedSince");
        const { data: regs } = await svc.from("wallet_registrations").select("serial").eq("device_id", dev);
        const tokens = (regs ?? []).map((r) => r.serial).filter((s) => s.startsWith("sellos-")).map((s) => s.slice(7));
        if (!tokens.length) return new Response(null, { status: 204 });
        let q = svc.from("sellos_tarjetas").select("token,updated_at").in("token", tokens);
        if (since && /^\d+$/.test(since)) q = q.gt("updated_at", new Date(Number(since)).toISOString());
        const { data: rows } = await q;
        if (!rows?.length) return new Response(null, { status: 204 });
        const last = Math.max(...rows.map((r) => new Date(r.updated_at).getTime()));
        return Response.json({ serialNumbers: rows.map((r) => "sellos-" + r.token), lastUpdated: String(last) });
      }

      const t = await tarjetaPorSerial(serial || "");
      if (!authOk(req, t)) return new Response(null, { status: 401 });

      if (req.method === "POST") {
        const { pushToken } = await req.json();
        const { data: existing } = await svc.from("wallet_registrations").select("device_id").eq("device_id", dev).eq("serial", serial).maybeSingle();
        await svc.from("wallet_registrations").upsert({ device_id: dev, serial, push_token: pushToken });
        return new Response(null, { status: existing ? 200 : 201 });
      }
      if (req.method === "DELETE") {
        await svc.from("wallet_registrations").delete().eq("device_id", dev).eq("serial", serial);
        return new Response(null, { status: 200 });
      }
    }

    // /v1/passes/{pti}/{serial}
    if (req.method === "GET" && parts[1] === "passes" && parts[2] === PTI) {
      const t = await tarjetaPorSerial(parts[3] || "");
      if (!authOk(req, t)) return new Response(null, { status: 401 });
      const ims = req.headers.get("if-modified-since");
      if (ims && new Date(t!.updated_at).getTime() <= new Date(ims).getTime() + 999) return new Response(null, { status: 304 });
      return pkpassResponse(await buildPass(t!), t!);
    }

    return new Response("not found", { status: 404 });
  } catch (e) {
    console.error("wallet-ws", e);
    return new Response("error", { status: 500 });
  }
});
