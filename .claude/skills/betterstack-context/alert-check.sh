#!/usr/bin/env bash
# Prove the DEPLOYED error channel actually delivers, end to end.
#
#   bash .claude/skills/betterstack-context/alert-check.sh staging
#   bash .claude/skills/betterstack-context/alert-check.sh <https://origin>
#
# Everything else in this repo proves the error channel only up to the edge of
# the Worker. typecheck, vitest and dsn-check.mjs all pass while the DEPLOYED
# worker reports nothing at all, because a wrong SENTRY_DSN secret does not
# fail: it goes quiet, which is the one failure specs/concepts/
# operational-alerting.md opens by promising against.
#
# The lever is /api/card-without-words: the product's one alert raised from an
# address anybody can reach (a card's words can only be checked in the reader's
# own browser, so the browser has to be able to say so). It takes a fixed shape,
# answers 204 whatever happens, and raises a real log.error on the way. So it
# fires the whole chain: deployed Worker, logger, Sentry SDK, vendor.
#
# NEVER RUN THIS AGAINST PRODUCTION without meaning to. The message is a
# CONSTANT, so a test fires the same issue a real broken card would, forever
# inflating its count and teaching the operator to dismiss the one alert that
# says members are being handed wordless cards. Staging is where this belongs.
# Production wiring is inferred from staging: same code, same DSN, same command
# that wrote the secret.
set -euo pipefail

TARGET="${1:-staging}"
case "$TARGET" in
  staging) ORIGIN="https://staging.app.xn--stttemedlem-hgb.no" ;;
  production) echo "Refusing: see the warning in this script. Pass the origin explicitly if you truly mean it." >&2; exit 2 ;;
  *) ORIGIN="$TARGET" ;;
esac

echo "origin: $ORIGIN"
curl -s -o /dev/null -w "  healthz  HTTP %{http_code}\n" "$ORIGIN/healthz"

CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$ORIGIN/api/card-without-words" \
  -H 'content-type: application/json' \
  -d '{"surface":"medlemsbevis","version":"wiretest","width":390}')
echo "  report   HTTP $CODE (204 is the only correct answer, even on refusal)"

cat <<'NOTE'

Now look in the vendor's error list. Within seconds you should see:

  "a member card was drawn without its words"   Error   Backoffice   staging

The environment tag is half the proof: it is what lets one environment's noise
be told from the other's. If the row never appears, the deployed SENTRY_DSN is
wrong or unset, and the product has been failing silently.

Resolve the row afterwards. It is not a real fault.
NOTE
