import { env } from "cloudflare:workers";
import { createDb, type Db } from "@stottemedlem/db";

/** Typed Drizzle client over the Worker's D1 binding. */
export function getDb(): Db {
  return createDb(env.DB);
}
