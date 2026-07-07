import { handle } from "@astrojs/cloudflare/handler";

export default {
  fetch: (request, env, ctx) => handle(request, env, ctx),

  // Cron Triggers (wrangler.jsonc `triggers.crons`). Implementations land in
  // later scaffolding steps: renewal-charge creation, nightly reconciliation.
  async scheduled(controller, _env, _ctx) {
    console.log(
      `scheduled tick ${controller.cron} @ ${new Date(controller.scheduledTime).toISOString()} — no jobs yet`,
    );
  },

  // Consumer for the Vipps webhook event queue. Idempotent event processing
  // lands with the webhook pipeline (scaffolding step 6).
  async queue(batch, _env) {
    console.log(`queue ${batch.queue}: ${batch.messages.length} message(s) — no consumer yet`);
    for (const message of batch.messages) {
      message.ack();
    }
  },
} satisfies ExportedHandler<Env>;
