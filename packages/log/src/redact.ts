/**
 * What an alert may carry out of the building: identifiers and counts, and
 * nothing a person typed (specs/concepts/operational-alerting.md).
 *
 * An alerting vendor's SDK attaches the failing request to the report by
 * default: its address, its headers, its cookies and, for a form post, the
 * whole form. In this product that form is the organization's payment keys
 * on the keys screen, a member's contact details on the member screen, and
 * the address of a member's own page carries the token that stands in for
 * their login. So every report is stripped here before it leaves, and the
 * report says that it was stripped: a leak that was stopped is still worth
 * seeing, because it means the vendor started sending something new.
 */

export interface AlertRequest {
  url?: string;
  /** A string, a name-to-value object, or name-value pairs: vendors differ. */
  query_string?: unknown;
  /** The request body, in whatever shape the vendor captured it. */
  data?: unknown;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}

/** The slice of a vendor's event this module touches, described structurally. */
export interface AlertEvent {
  request?: AlertRequest;
  tags?: Record<string, unknown>;
}

export interface RedactOptions {
  /**
   * Query parameters whose value is a secret: the token in a member's own
   * address. Their values are blanked in the URL and the query string; the
   * names stay, so the report still says which page it was.
   */
  secretQueryParams: readonly string[];
}

/** The tag a stripped report carries, listing what was taken out. */
export const REDACTED_TAG = "redacted";

const REDACTED = "[redacted]";

/** Headers that carry a credential, whichever way the vendor spells them. */
const SECRET_HEADERS = new Set(["authorization", "cookie", "set-cookie"]);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Blank the value of each secret parameter in `text`, where a parameter
 * starts after one of `starts` (`?` or `&` in a URL, start or `&` in a bare
 * query string). */
function blankParams(text: string, secrets: readonly string[], starts: string): string {
  let out = text;
  for (const name of secrets) {
    out = out.replace(new RegExp(`(${starts}${escapeRegExp(name)}=)[^&#]*`, "g"), `$1${REDACTED}`);
  }
  return out;
}

function blankQueryString(
  query: unknown,
  secrets: readonly string[],
): { value: unknown; changed: boolean } {
  const secretSet = new Set(secrets);
  if (typeof query === "string") {
    const value = blankParams(query, secrets, "(?:^|&)");
    return { value, changed: value !== query };
  }
  if (Array.isArray(query)) {
    let changed = false;
    const value = query.map((pair: unknown) => {
      if (Array.isArray(pair) && typeof pair[0] === "string" && secretSet.has(pair[0])) {
        changed = true;
        return [pair[0], REDACTED];
      }
      return pair;
    });
    return { value, changed };
  }
  if (query && typeof query === "object") {
    let changed = false;
    const value: Record<string, unknown> = {};
    for (const [name, raw] of Object.entries(query as Record<string, unknown>)) {
      if (secretSet.has(name)) {
        changed = true;
        value[name] = REDACTED;
      } else {
        value[name] = raw;
      }
    }
    return { value, changed };
  }
  return { value: query, changed: false };
}

/**
 * Strip a report of everything an alert must not carry, and tag it with what
 * was stripped. Returns the same event, so it can stand directly as a
 * vendor's `beforeSend` hook. An event without a request is returned as is.
 */
export function redactAlert<T extends AlertEvent>(event: T, options: RedactOptions): T {
  const request = event.request;
  if (!request) return event;
  const stripped = new Set<string>();

  if (request.data !== undefined) {
    delete request.data;
    stripped.add("body");
  }
  if (request.cookies !== undefined) {
    delete request.cookies;
    stripped.add("cookies");
  }
  if (request.headers) {
    for (const name of Object.keys(request.headers)) {
      if (SECRET_HEADERS.has(name.toLowerCase())) {
        delete request.headers[name];
        stripped.add("headers");
      }
    }
  }
  if (typeof request.url === "string") {
    const url = blankParams(request.url, options.secretQueryParams, "[?&]");
    if (url !== request.url) {
      request.url = url;
      stripped.add("token");
    }
  }
  if (request.query_string !== undefined) {
    const query = blankQueryString(request.query_string, options.secretQueryParams);
    if (query.changed) {
      request.query_string = query.value;
      stripped.add("token");
    }
  }

  if (stripped.size > 0) {
    event.tags = { ...event.tags, [REDACTED_TAG]: [...stripped].sort().join(",") };
  }
  return event;
}
