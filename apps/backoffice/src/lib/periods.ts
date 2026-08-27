import { env } from "cloudflare:workers";
import { getPeriodScheme } from "@stottemedlem/core";

// The environment's period scheme (specs/concepts/annual-period.md): the
// calendar year in production, the ISO week on accelerated staging — where a
// week is treated as a year so a full membership lifecycle can be rehearsed
// against Vipps' test environment in days. Everything that thinks in periods
// (joining, renewals, notices, reconciliation, member status) asks this
// instead of the calendar.
export const periods = getPeriodScheme(env.PERIOD_SCHEME);
