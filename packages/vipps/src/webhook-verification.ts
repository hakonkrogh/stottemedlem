/**
 * HMAC validation of Vipps webhook deliveries, per
 * developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication/.
 *
 * Every delivery carries `x-ms-date`, `x-ms-content-sha256` (base64 SHA-256 of
 * the body) and an `Authorization` header of the form
 * `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=<base64>`.
 * The signature is HMAC-SHA256, keyed with the registration secret used
 * directly as UTF-8 bytes, over:
 *
 *     <METHOD>\n<pathAndQuery>\n<x-ms-date>;<host>;<x-ms-content-sha256>
 *
 * Web Crypto only — works on Cloudflare workerd and Node ≥ 20 alike.
 */

/** The parts of an incoming delivery that participate in validation. */
export interface WebhookDelivery {
  /** Always "POST" for Vipps deliveries. */
  method: string;
  /** Path + query of the receiver URL, e.g. "/webhooks/vipps". */
  pathAndQuery: string;
  /** The Host header value (no scheme), e.g. "app.example.no". */
  host: string;
  /** The `x-ms-date` header, verbatim. */
  date: string;
  /** The `x-ms-content-sha256` header, verbatim. */
  contentSha256: string;
  /** The `Authorization` header, verbatim. */
  authorization: string;
  /** The raw request body, exactly as received. */
  body: string;
}

const encoder = new TextEncoder();

function toBase64(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Base64-encoded SHA-256 of the body — must equal `x-ms-content-sha256`. */
export async function contentSha256(body: string): Promise<string> {
  return toBase64(await crypto.subtle.digest("SHA-256", encoder.encode(body)));
}

function extractSignature(authorization: string): string | null {
  const match =
    /^HMAC-SHA256\s+SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=(.+)$/.exec(
      authorization.trim(),
    );
  return match?.[1] ?? null;
}

/**
 * Validate a delivery against the registration secret. Returns false — never
 * throws — on any mismatch (tampered body, wrong signed string, bad secret,
 * malformed headers), so the receiver can respond 401 and move on.
 */
export async function verifyWebhookDelivery(
  delivery: WebhookDelivery,
  secret: string,
): Promise<boolean> {
  if ((await contentSha256(delivery.body)) !== delivery.contentSha256) return false;

  const signature = extractSignature(delivery.authorization);
  if (signature === null) return false;
  const signatureBytes = fromBase64(signature);
  if (signatureBytes === null) return false;

  const signedString = `${delivery.method}\n${delivery.pathAndQuery}\n${delivery.date};${delivery.host};${delivery.contentSha256}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  // subtle.verify compares in constant time — no manual signature comparison.
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes as unknown as ArrayBuffer,
    encoder.encode(signedString),
  );
}

/** Sign a delivery the way Vipps does — for tests and local fixtures. */
export async function signWebhookDelivery(
  delivery: Omit<WebhookDelivery, "authorization" | "contentSha256">,
  secret: string,
): Promise<Pick<WebhookDelivery, "authorization" | "contentSha256">> {
  const hash = await contentSha256(delivery.body);
  const signedString = `${delivery.method}\n${delivery.pathAndQuery}\n${delivery.date};${delivery.host};${hash}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = toBase64(await crypto.subtle.sign("HMAC", key, encoder.encode(signedString)));
  return {
    contentSha256: hash,
    authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
  };
}
