// Ruleta BF 2026 · genera el pase de Apple Wallet (.pkpass) del premio de una clienta.
// GET /functions/v1/ruleta-pass?t={token}
//  - iPhone / iPad / Mac → descarga el .pkpass firmado (Safari muestra "Agregar a Wallet").
//  - Otros (Android, etc.) → redirige a la página del premio en ops.luxurjeans.com.
// La llave y el certificado del pase viven en Supabase Vault y se leen con ruleta_pass_secrets()
// (solo service_role). Pass Type ID: pass.com.luxurjeans.ruleta · Team: L87D2G2PS2.

import forge from "npm:node-forge@1.3.1";
import { zipSync, strToU8 } from "npm:fflate@0.8.2";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const PAGE = (t: string) => `https://ops.luxurjeans.com/premio/${encodeURIComponent(t)}`;

const ICONS: Record<string, string> = {
  "icon.png": "iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAIAAADZ8fBYAAAAX0lEQVR4XmOUkZFhoAFgooGZIDBqLgSMhgNR4RDj53tp44ZLGzfMa20lKUWOhi9R4Us2GA3foRm+LETGuImO9qWNG5AV106atHHvPlzaaZUeGEfrt9H6AgnQKp0NNXMBhRIOc59i39MAAAAASUVORK5CYII=",
  "icon@2x.png": "iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAIAAABu2d1/AAAApUlEQVR4Xu3ZvQnDMBBAYdtkDHUCFQHvkzls8BD5GSO906X3Bi7caZeQLhCSwuIVgvcNcJwf1xi1IYSmHl09q765Lsm6JOuSrEuyLsm6JOuSDoXD75dzn9LnkC3n0zAWjv3FYyBZl2RdknVJ1iVZl2RdknVJ1iVZl1T6a/ntGOP6mP/vPF1vz2XZ8V0eA8m6pNZXS5C3S7Iuybok65KsS7IuybqkF0jyDY/Rk6tDAAAAAElFTkSuQmCC",
  "icon@3x.png": "iVBORw0KGgoAAAANSUhEUgAAAFcAAABXCAIAAAD+qk47AAABCElEQVR4Xu3csQnCQBhAYSMuETiucSIH0cYpdAEzhoKdfQawt8kkEjAgwbtDjFW+12vkuP9/r1CrEMJi9ixnfwI9TsEpDLgL7oK78I6JMBEmwkSMsRfsBXvBXrAXPmE72o62o+1oO9qOKTiCIwZWyVsyBbGur80p9U6Prttsd1M851dMhIlQTapJNakm1ZSDKZmSKZmSKZmSKZmyhF7QC3pBL+gFvaAX9EIJvaAX9IJe0At6QS/ohRL//f5CnnWM98u59AnH7A/HW9t++6o8qkk1qSbVpJpUU4rKPw/4zf0LveAuuAt6QS/ohRQcwREcwREcwREckYMpmZIpmZIpmZIpmbKEXuh5AgBuDbhy1lnpAAAAAElFTkSuQmCC",
};

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const binToBytes = (bin: string) => Uint8Array.from(bin, (c) => c.charCodeAt(0));
const bytesToBin = (u8: Uint8Array) => { let s = ""; for (const b of u8) s += String.fromCharCode(b); return s; };
const sha1 = (u8: Uint8Array) => { const md = forge.md.sha1.create(); md.update(bytesToBin(u8)); return md.digest().toHex(); };

let secrets: { key: string; cert: string; wwdr: string } | null = null;
async function getSecrets() {
  if (!secrets) {
    const { data, error } = await sb.rpc("ruleta_pass_secrets");
    if (error || !data) throw new Error("secrets: " + (error?.message ?? "vacío"));
    secrets = data;
  }
  return secrets!;
}

export function buildPassJson(p: { code: string; titulo: string; detalle: string }, token: string) {
  return {
    formatVersion: 1,
    passTypeIdentifier: "pass.com.luxurjeans.ruleta",
    teamIdentifier: "L87D2G2PS2",
    serialNumber: token,
    organizationName: "LUXUR",
    description: "Premio de la ruleta LUXUR",
    logoText: "LUXUR",
    backgroundColor: "rgb(28,28,28)",
    foregroundColor: "rgb(251,250,247)",
    labelColor: "rgb(238,205,204)",
    expirationDate: "2026-12-17T04:59:59Z",
    relevantDate: "2026-12-01T05:00:00Z",
    barcodes: [{ format: "PKBarcodeFormatQR", message: p.code, messageEncoding: "iso-8859-1", altText: p.code }],
    coupon: {
      primaryFields: [{ key: "premio", label: "TU PREMIO", value: p.titulo }],
      secondaryFields: [{ key: "vigencia", label: "VÁLIDO", value: "1 al 16 de diciembre" }],
      auxiliaryFields: [{ key: "codigo", label: "CÓDIGO", value: p.code }],
      backFields: [
        { key: "detalle", label: "Premio", value: `${p.titulo}. ${p.detalle}` },
        { key: "como", label: "Cómo usarlo", value: "En la tienda de Ámsterdam Plaza muestra este código en caja. En la web escríbelo en el campo de descuento al pagar." },
        { key: "reglas", label: "Condiciones", value: "Válido del 1 al 16 de diciembre de 2026. Un solo uso. No se acumula con otros descuentos." },
      ],
    },
  };
}

export function buildPkpass(passJson: unknown, s: { key: string; cert: string; wwdr: string }) {
  const files: Record<string, Uint8Array> = { "pass.json": strToU8(JSON.stringify(passJson)) };
  for (const [n, b] of Object.entries(ICONS)) files[n] = b64ToBytes(b);
  const manifest: Record<string, string> = {};
  for (const [n, b] of Object.entries(files)) manifest[n] = sha1(b);
  const manifestBytes = strToU8(JSON.stringify(manifest));

  const cert = forge.pki.certificateFromPem(s.cert);
  const wwdr = forge.pki.certificateFromPem(s.wwdr);
  const key = forge.pki.privateKeyFromPem(s.key);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(bytesToBin(manifestBytes));
  p7.addCertificate(cert);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key, certificate: cert, digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: true });
  const signature = binToBytes(forge.asn1.toDer(p7.toAsn1()).getBytes());

  return zipSync({ ...files, "manifest.json": manifestBytes, "signature": signature }, { level: 6 });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const t = (url.searchParams.get("t") || "").trim();
  const ua = req.headers.get("user-agent") || "";
  const apple = /iPhone|iPad|iPod|Macintosh/i.test(ua) || url.searchParams.get("force") === "1";
  if (!t || !apple) return Response.redirect(PAGE(t), 302);
  try {
    const { data: p, error } = await sb.rpc("ruleta_premio", { p_token: t });
    if (error || !p) return Response.redirect(PAGE(t), 302);
    const pkpass = buildPkpass(buildPassJson(p, t), await getSecrets());
    return new Response(pkpass, {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="premio-luxur.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("ruleta-pass", e);
    return Response.redirect(PAGE(t), 302);
  }
});
