import AdministratorsScreen from "./AdministratorsScreen.astro";
import StoryScreen from "./StoryScreen.astro";
import { ADMINISTRATORS, ORG, ORG_PATH, PENDING_INVITES } from "./storyFixtures";

export default {
  title: "Backoffice/Administratorer",
  component: StoryScreen,
};

const screen = (props: Record<string, unknown> = {}) => ({
  active: "innstillinger",
  slots: {
    default: {
      component: AdministratorsScreen,
      props: {
        orgName: ORG.name,
        orgPath: ORG_PATH,
        administrators: ADMINISTRATORS,
        invitations: PENDING_INVITES,
        ...props,
      },
    },
  },
});

/** Three people share the work, and a fourth has been asked. */
export const Default = { args: screen() };

/**
 * The ordinary start: whoever created the organization, alone. No remove
 * action anywhere, and the reason said out loud rather than left to be
 * guessed at (specs/concepts/administrator.md).
 */
export const AloneSoFar = {
  args: screen({ administrators: ADMINISTRATORS.slice(0, 1), invitations: [] }),
};

/**
 * Alone, but somebody has been asked. The invitation is NOT an administrator,
 * so the last one still cannot be removed.
 */
export const AloneWithAnInvitationOut = {
  args: screen({ administrators: ADMINISTRATORS.slice(0, 1) }),
};

/** The invitation has gone out, and the address is told back. */
export const JustInvited = {
  args: screen({ invitedEmail: PENDING_INVITES[0]?.email }),
};

/** Inviting somebody who is already here says so, and sends nothing. */
export const AlreadyHasAccess = {
  args: screen({
    email: "ola@bakvendtland.example",
    emailError: "Denne adressen har allerede tilgang.",
  }),
};

/** The invitation was withdrawn, so the address is free to invite again. */
export const InvitationWithdrawn = {
  args: screen({
    invitations: [],
    withdrawnEmail: "nils@bakvendtland.example",
  }),
};

/**
 * Access taken away, and the person said back. Somebody who never gave a name
 * is named by their address, which is what the list showed them as.
 */
export const JustRemoved = {
  args: screen({
    administrators: ADMINISTRATORS.slice(0, 2),
    removedName: "kasserer@bakvendtland.example",
  }),
};

/**
 * Somebody else removed an administrator while this screen was open, so the
 * press landed on the last one. The refusal is stated, and the list under it
 * is the fresh truth.
 */
export const LastOneCannotGo = {
  args: screen({
    administrators: ADMINISTRATORS.slice(0, 1),
    invitations: [],
    failure: "Den siste administratoren kan ikke fjernes. Inviter noen andre inn først.",
  }),
};

/** Nothing was sent, because the sending itself failed. */
export const SendingFailed = {
  args: screen({
    email: "nils@bakvendtland.example",
    failure: "Vi fikk ikke sendt invitasjonen nå. Prøv igjen om litt.",
  }),
};
