import type { OrgWarning } from "./orgWarnings";

// The back office's one navigation model (specs/use-cases/access-the-back-office.md):
// an organization is four places, and every screen belongs to exactly one of
// them. The tabs are ordinary links to ordinary pages — the tab bar is chrome,
// not a widget.

export type OrgTabId = "oversikt" | "medlemmer" | "medlemskap" | "innstillinger";

export interface OrgTab {
  id: OrgTabId;
  label: string;
  href: string;
  /** How many warnings this tab is where you go to fix. */
  warnings: number;
  /** A quiet standing number the tab is worth carrying — omitted when zero. */
  count?: number;
}

export function orgTabs(orgPath: string, warnings: OrgWarning[] = [], activeMembers = 0): OrgTab[] {
  const count = (id: OrgTabId) => warnings.filter((w) => w.tab === id).length;
  // Settings sits last: it is where you go when something needs changing, not
  // where the day-to-day work is.
  return [
    { id: "oversikt", label: "Oversikt", href: orgPath, warnings: 0 },
    {
      id: "medlemmer",
      label: "Medlemmer",
      href: `${orgPath}/medlemmer`,
      warnings: 0,
      // How many people currently support the organization is the product's
      // one standing number — worth carrying everywhere, not a section of its
      // own on the front page.
      count: activeMembers > 0 ? activeMembers : undefined,
    },
    {
      id: "medlemskap",
      label: "Medlemskap",
      href: `${orgPath}/medlemskap`,
      warnings: count("medlemskap"),
    },
    {
      id: "innstillinger",
      label: "Innstillinger",
      href: `${orgPath}/innstillinger`,
      warnings: count("innstillinger"),
    },
  ];
}
