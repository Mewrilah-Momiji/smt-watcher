export interface AbuseContact {
  /** Addresses the registry lists for abuse reports, or else the network's own contacts. Can be empty. */
  addresses: string[];
  /** True if the record names no abuse address and these are technical or administrative contacts. */
  networkContact: boolean;
  /** The registry that answered, such as RIPE. */
  registry: string;
}

/** Where the lookup may connect. The Content-Security-Policy allows these hosts and no others. */
export const RDAP_HOSTS: Record<string, string> = {
  'rdap.org': 'rdap.org',
  'rdap.arin.net': 'ARIN',
  'rdap.db.ripe.net': 'RIPE',
  'rdap.apnic.net': 'APNIC',
  // APNIC forwards to national registries such as twnic.rdap.apnic.net.
  '*.rdap.apnic.net': 'APNIC',
  'rdap.lacnic.net': 'LACNIC',
  'rdap.registro.br': 'NIC.br',
  'rdap.afrinic.net': 'AFRINIC',
};

const APNIC_NATIONAL_SUFFIX = '.rdap.apnic.net';

function registryName(host: string): string {
  if (host.endsWith(APNIC_NATIONAL_SUFFIX)) return host.slice(0, -APNIC_NATIONAL_SUFFIX.length).toUpperCase();
  return RDAP_HOSTS[host] ?? host;
}

const LOOKUP_TIMEOUT_MS = 10_000;
const MAX_ADDRESSES = 3;
const ADDRESS_PATTERN = /^[^\s@<>"',;:()]+@[^\s@<>"',;:()]+\.[a-z]{2,}$/i;

export function rdapUrl(ip: string): string {
  return `https://rdap.org/ip/${encodeURIComponent(ip)}`;
}

interface RdapEntity {
  roles?: unknown;
  vcardArray?: unknown;
  entities?: unknown;
}

function emailsOf(entity: RdapEntity): string[] {
  const properties = Array.isArray(entity.vcardArray) ? entity.vcardArray[1] : null;
  if (!Array.isArray(properties)) return [];
  return properties.flatMap((property) => (Array.isArray(property) && property[0] === 'email' && typeof property[3] === 'string' ? [property[3].trim()] : []));
}

/** The answer comes from outside, so anything unexpected is left out. */
function findAddresses(rdap: unknown, roles: string[]): string[] {
  const found = new Set<string>();
  const walk = (entities: unknown): void => {
    if (!Array.isArray(entities)) return;
    for (const entity of entities as RdapEntity[]) {
      if (!entity || typeof entity !== 'object') continue;
      if (Array.isArray(entity.roles) && roles.some((role) => (entity.roles as unknown[]).includes(role))) {
        for (const email of emailsOf(entity)) {
          if (ADDRESS_PATTERN.test(email)) found.add(email.toLowerCase());
        }
      }
      walk(entity.entities);
    }
  };
  walk((rdap as RdapEntity | null)?.entities);
  return [...found].slice(0, MAX_ADDRESSES);
}

export function findAbuseAddresses(rdap: unknown): string[] {
  return findAddresses(rdap, ['abuse']);
}

/** Some national registries list no abuse role. The registrant is left out: that can be a private customer. */
export function findNetworkContacts(rdap: unknown): string[] {
  return findAddresses(rdap, ['technical', 'administrative']);
}

/** Only the IP address leaves the page: no cookies, no referrer and nothing from the email. */
export async function lookUpAbuseContact(ip: string, fetcher: typeof fetch = fetch): Promise<AbuseContact> {
  const response = await fetcher(rdapUrl(ip), {
    headers: { accept: 'application/rdap+json' },
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`RDAP answered ${response.status}`);
  const registry = registryName(new URL(response.url).host);
  const rdap: unknown = await response.json();
  const abuse = findAbuseAddresses(rdap);
  if (abuse.length > 0) return { addresses: abuse, networkContact: false, registry };
  const contacts = findNetworkContacts(rdap);
  return { addresses: contacts, networkContact: contacts.length > 0, registry };
}
