/**
 * Where to turn with an extortion email. Checked on 2026-11-13, see docs/reporting-channels.md.
 * Neither is a reporting body in the usual sense: the page only links to them.
 */

/** The joint portal of the German state police forces. It leads to the online police station of each of the 16 states. */
export const GERMAN_POLICE_PORTAL = 'https://portal.onlinewache.polizei.de/de/';

/** Chainabuse, run by TRM Labs, keeps public reports on crypto addresses. */
export const CHAINABUSE_REPORT = 'https://www.chainabuse.com/report';

export function chainabuseAddressUrl(address: string): string {
  return `https://www.chainabuse.com/address/${encodeURIComponent(address)}`;
}
