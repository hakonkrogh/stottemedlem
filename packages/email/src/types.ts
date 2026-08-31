/**
 * One message to one person. The product sends two kinds: member notices
 * (specs/concepts/member-notice.md), which cannot be declined — a member who
 * wants those to stop ends the membership instead — and organization messages
 * (specs/concepts/org-message.md), which always carry a one-click decline.
 * Either way there is no audience or campaign here: composing the right
 * message to the right person happens upstream, one at a time.
 */
export interface EmailMessage {
  to: string;
  /**
   * Who the member should think this is from. A notice is the organization's
   * word, carried by us: the address stays ours — an unread noreply address,
   * since only we can prove we own it — the name is theirs.
   */
  fromName: string;
  /** Where a reply goes — the organization, never the product. */
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  /**
   * Files travelling with the message — a member's card riding along with
   * their receipt (specs/concepts/member-card.md), so they keep something they
   * can save and show even if the mail client refuses to load pictures.
   *
   * A message that carries one cannot be batched by the provider, so keep
   * attachments to the messages that genuinely want them.
   */
  attachments?: EmailAttachment[];
}

/** One file on a message. */
export interface EmailAttachment {
  filename: string;
  /** The file's bytes, base64-encoded — what mail providers take. */
  contentBase64: string;
  contentType: string;
}

/**
 * What became of one message. Recorded rather than assumed: a notice we did not
 * manage to send must not count as having told the member
 * (specs/concepts/member-notice.md).
 */
export interface EmailResult {
  to: string;
  sent: boolean;
  /** The provider's id when sent, its complaint when not. */
  detail?: string;
}

export interface EmailSender {
  send(messages: EmailMessage[]): Promise<EmailResult[]>;
}
