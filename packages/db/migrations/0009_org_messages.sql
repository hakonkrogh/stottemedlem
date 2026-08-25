-- Organization messages (specs/concepts/org-message.md): the organization's
-- own word to its supporting members, as opposed to the product's member
-- notices. The audience is derived from the live register when the message is
-- sent — these tables record what was said and what actually went out, never
-- who was *going* to get it.

-- A member's standing choice to decline organization messages
-- (specs/use-cases/keep-supporters-in-the-loop.md). Null = may be contacted.
-- Member notices ignore this column on purpose: declining news never declines
-- being told what you will be charged (specs/concepts/member-notice.md).
ALTER TABLE supporting_members ADD COLUMN messages_declined_at TEXT;

CREATE TABLE org_messages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  subject TEXT NOT NULL,
  -- Plain text with blank-line paragraphs; the product offers no formatting.
  body TEXT NOT NULL,
  -- 'active' (the default audience) or 'all' (deliberately also lapsed).
  audience TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Set when the send job finished walking the audience; null = still queued.
  sent_at TEXT
);
CREATE INDEX org_messages_org ON org_messages (org_id, created_at);

-- One row per member the send job dealt with, in whatever way it ended:
-- 'sent' (the provider accepted it), 'failed' (it did not), 'unreachable'
-- (no address to send to). The unique index is what makes a retried send
-- idempotent — a member already dealt with is never contacted twice.
CREATE TABLE org_message_recipients (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES org_messages(id),
  org_id TEXT NOT NULL REFERENCES organizations(id),
  member_id TEXT NOT NULL REFERENCES supporting_members(id),
  outcome TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX org_message_recipients_member
  ON org_message_recipients (message_id, member_id);
