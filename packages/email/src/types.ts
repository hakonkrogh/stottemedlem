/**
 * One message to one person. The product only ever sends
 * specs/concepts/member-notice.md — messages about someone's own membership —
 * so there is no audience, no campaign, and no unsubscribe link: a member who
 * wants these to stop ends the membership, which every notice tells them how
 * to do.
 */
export interface EmailMessage {
  to: string;
  /**
   * Who the member should think this is from. A notice is the organization's
   * word, carried by us: the address stays ours (only we can prove we own it),
   * the name is theirs.
   */
  fromName: string;
  /** Where a reply goes — the organization, never the product. */
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
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
