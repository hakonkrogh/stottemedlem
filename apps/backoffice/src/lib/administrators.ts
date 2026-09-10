import {
  type AdministratorRemovalRefusal,
  administratorInviteRefusal,
  administratorRemovalRefusal,
  normalizeAdministratorEmail,
} from "@stottemedlem/core";
import type { WorkOS } from "@workos-inc/node";
import { logger } from "./log";

// Who may act for an organization, and how somebody else is let in
// (specs/use-cases/manage-administrators.md).
//
// WorkOS is the authority here, exactly as it is for access itself
// (specs/concepts/administrator.md): the product stores no copy of who
// administers an organization, so this module only reads and asks: the list
// on screen is what WorkOS says right now.

const log = logger("administrators");

/** A person who can act for the organization today. */
export interface AdministratorEntry {
  userId: string;
  /** The membership, which is what taking access away actually deletes. */
  membershipId: string;
  /** Their name if they have given one; the address is always there. */
  name: string | null;
  email: string;
  /** True for the administrator reading the screen. */
  isYou: boolean;
}

/** An invitation sent and not yet accepted. */
export interface PendingInviteEntry {
  id: string;
  email: string;
  sentAt: string;
  expiresAt: string;
}

export interface AdministratorsView {
  administrators: AdministratorEntry[];
  invitations: PendingInviteEntry[];
}

/** WorkOS pages at 100; an organization with more administrators than that is
 *  not a thing this product has, and the list is truthful about what it shows. */
const PAGE_LIMIT = 100;

/**
 * Everyone with access to the organization, plus the invitations still
 * waiting. Names come from the user records; a membership whose user is not in
 * the org listing is looked up on its own rather than dropped, because a line
 * missing from this list would read as access that does not exist.
 */
export async function loadAdministrators(
  workos: WorkOS,
  workosOrgId: string,
  currentUserId: string,
): Promise<AdministratorsView> {
  const [memberships, users, invitations] = await Promise.all([
    workos.userManagement.listOrganizationMemberships({
      organizationId: workosOrgId,
      statuses: ["active"],
      limit: PAGE_LIMIT,
    }),
    workos.userManagement.listUsers({ organizationId: workosOrgId, limit: PAGE_LIMIT }),
    workos.userManagement.listInvitations({ organizationId: workosOrgId, limit: PAGE_LIMIT }),
  ]);

  const byId = new Map(users.data.map((user) => [user.id, user]));
  const missing = memberships.data.filter((m) => !byId.has(m.userId));
  if (missing.length > 0) {
    const fetched = await Promise.all(missing.map((m) => workos.userManagement.getUser(m.userId)));
    for (const user of fetched) byId.set(user.id, user);
  }

  const administrators: AdministratorEntry[] = memberships.data.map((membership) => {
    const user = byId.get(membership.userId);
    const name =
      user?.name?.trim() ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      null;
    return {
      userId: membership.userId,
      membershipId: membership.id,
      name,
      email: user?.email ?? "",
      isYou: membership.userId === currentUserId,
    };
  });
  // The reader first, then everyone else by the name they are found under, so
  // the order is the same on every visit.
  administrators.sort((a, b) => {
    if (a.isYou !== b.isYou) return a.isYou ? -1 : 1;
    return (a.name ?? a.email).localeCompare(b.name ?? b.email, "nb-NO");
  });

  const pending: PendingInviteEntry[] = invitations.data
    .filter((invitation) => invitation.state === "pending")
    .map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      sentAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
    }))
    .sort((a, b) => a.email.localeCompare(b.email, "nb-NO"));

  return { administrators, invitations: pending };
}

/** What came of asking to invite somebody, in the terms the screen speaks. */
export type InviteOutcome =
  | { ok: true; email: string }
  | {
      ok: false;
      error: "invalid-email" | "already-an-administrator" | "already-invited" | "failed";
    };

/**
 * Invite an address into the organization. The two "already" refusals are
 * decided here, against the list just loaded, so the administrator is told
 * rather than sending a second email and finding out from the recipient.
 */
export async function inviteAdministrator(
  workos: WorkOS,
  options: {
    workosOrgId: string;
    email: string;
    inviterUserId: string;
    view: AdministratorsView;
  },
): Promise<InviteOutcome> {
  const email = normalizeAdministratorEmail(options.email);
  const refusal = administratorInviteRefusal(email, {
    administratorEmails: options.view.administrators.map((a) => a.email),
    pendingInviteEmails: options.view.invitations.map((i) => i.email),
  });
  if (refusal) return { ok: false, error: refusal };

  try {
    await workos.userManagement.sendInvitation({
      email,
      organizationId: options.workosOrgId,
      inviterUserId: options.inviterUserId,
      // The product speaks Norwegian to everyone it writes to.
      locale: "nb",
    });
    return { ok: true, email };
  } catch (error) {
    log.error("could not send administrator invitation", error, {
      orgId: options.workosOrgId,
    });
    return { ok: false, error: "failed" };
  }
}

/** What came of asking to take somebody's access away. */
export type RemovalOutcome =
  | { ok: true; who: string; wasYou: boolean }
  | { ok: false; error: AdministratorRemovalRefusal | "failed" };

/**
 * Take one person's access to this organization away.
 *
 * The last-administrator guard is decided by the pure `administratorRemovalRefusal`
 * against the list this request just read, because WorkOS enforces nothing of
 * the sort: `deleteOrganizationMembership` will happily empty an organization.
 * The read is moments old, so two administrators removing each other in the
 * very same instant could still get through; a lock is not worth it for an
 * organization with a handful of volunteers, and inviting somebody back is the
 * repair.
 */
export async function removeAdministrator(
  workos: WorkOS,
  options: { workosOrgId: string; userId: string; view: AdministratorsView },
): Promise<RemovalOutcome> {
  const refusal = administratorRemovalRefusal(
    options.userId,
    options.view.administrators.map((a) => a.userId),
  );
  if (refusal) return { ok: false, error: refusal };

  const person = options.view.administrators.find((a) => a.userId === options.userId);
  if (!person) return { ok: false, error: "not-an-administrator" };
  try {
    await workos.userManagement.deleteOrganizationMembership(person.membershipId);
    return { ok: true, who: person.name ?? person.email, wasYou: person.isYou };
  } catch (error) {
    log.error("could not remove an administrator", error, { orgId: options.workosOrgId });
    return { ok: false, error: "failed" };
  }
}

/**
 * Withdraw an invitation that has not been accepted. The id is only acted on
 * when it is one of THIS organization's pending invitations: an administrator
 * of one organization must never be able to reach into another's by posting an
 * id they guessed.
 */
export async function withdrawInvitation(
  workos: WorkOS,
  options: { workosOrgId: string; invitationId: string; view: AdministratorsView },
): Promise<{ ok: true; email: string } | { ok: false }> {
  const invitation = options.view.invitations.find((i) => i.id === options.invitationId);
  if (!invitation) return { ok: false };
  try {
    await workos.userManagement.revokeInvitation(invitation.id);
    return { ok: true, email: invitation.email };
  } catch (error) {
    log.error("could not withdraw administrator invitation", error, {
      orgId: options.workosOrgId,
    });
    return { ok: false };
  }
}
