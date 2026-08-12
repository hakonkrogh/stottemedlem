-- Visual identity for the public org landing page: R2 object keys for the
-- uploaded logo and banner image. NULL means the org has not uploaded one.
ALTER TABLE organizations ADD COLUMN logo_key TEXT;
ALTER TABLE organizations ADD COLUMN banner_key TEXT;
