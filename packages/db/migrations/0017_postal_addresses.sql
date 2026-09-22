-- Postal addresses (specs/use-cases/collect-postal-addresses.md,
-- specs/concepts/member-data.md).
--
-- Every organization gets printed member cards to post, so the address is
-- asked for from the start, and the supporter is told why in a standard
-- sentence. An organization may write its own reason instead (NULL = the
-- standard one), and may opt out altogether: set when it did, NULL while it
-- asks, which is every organization until it decides otherwise.
ALTER TABLE organizations ADD COLUMN postal_address_reason TEXT;
ALTER TABLE organizations ADD COLUMN postal_addresses_declined_at TEXT;

-- The address itself, kept as its parts rather than one line of text, so it
-- can be put on an envelope and read back reliably. Filled from the payment
-- provider's profile at joining, once, and never fetched again; NULL for a
-- member who joined before the product asked, or whose profile held none.
ALTER TABLE supporting_members ADD COLUMN street_address TEXT;
ALTER TABLE supporting_members ADD COLUMN postal_code TEXT;
ALTER TABLE supporting_members ADD COLUMN city TEXT;
ALTER TABLE supporting_members ADD COLUMN country TEXT;
