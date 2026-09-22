// Does this DSN accept an event? One envelope, no SDK.
const dsn = process.argv[2];
const m = dsn?.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
if (!m) {
  console.error("usage: node dsn-check.mjs https://KEY@HOST/PROJECT_ID");
  process.exit(2);
}
const [, key, host, projectId] = m;
const eventId = [...crypto.getRandomValues(new Uint8Array(16))]
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");
const now = new Date().toISOString();

const envelope = [
  JSON.stringify({ event_id: eventId, sent_at: now, dsn }),
  JSON.stringify({ type: "event" }),
  JSON.stringify({
    event_id: eventId,
    timestamp: now,
    platform: "javascript",
    level: "info",
    logger: "dsn-check",
    environment: "development",
    message: { formatted: "DSN reachability check, sent by hand. Safe to resolve." },
  }),
].join("\n");

const url = `https://${host}/api/${projectId}/envelope/`;
console.log("endpoint:", url);
console.log("key:", `${key.slice(0, 4)}...${key.slice(-4)}`, " event_id:", eventId);

const res = await fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/x-sentry-envelope",
    // The envelope's own `dsn` field is not accepted as authentication here;
    // the SDK's X-Sentry-Auth header is what the ingest host wants.
    "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=dsn-check/1.0`,
  },
  body: envelope,
});
console.log("HTTP", res.status, res.statusText);
console.log("body:", (await res.text()).slice(0, 300));
