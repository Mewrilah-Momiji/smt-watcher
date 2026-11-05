import { COUNTRIES, defaultCountry } from './data/reportingBodies';

const COUNTRY_KEY = 'smt-watcher-country';

/**
 * Time zones of the countries in the list. The browser knows its time zone without asking anyone, so it says where
 * someone lives without a request to a location service, which the page would not make.
 */
const ZONE_COUNTRIES: Record<string, string> = {
  'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/Paris': 'FR', 'Europe/London': 'GB',
  'Europe/Dublin': 'IE', 'Europe/Rome': 'IT', 'Europe/Brussels': 'BE', 'Europe/Amsterdam': 'NL', 'Europe/Warsaw': 'PL', 'Europe/Copenhagen': 'DK',
  'Europe/Prague': 'CZ', 'Europe/Luxembourg': 'LU', 'Europe/Bratislava': 'SK', 'Europe/Budapest': 'HU', 'Europe/Ljubljana': 'SI',
  'Europe/Stockholm': 'SE', 'Europe/Helsinki': 'FI', 'Europe/Oslo': 'NO', 'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES',
  'Europe/Lisbon': 'PT', 'Atlantic/Madeira': 'PT', 'Atlantic/Azores': 'PT', 'Europe/Sofia': 'BG', 'Europe/Bucharest': 'RO', 'Europe/Athens': 'GR',
  'Asia/Nicosia': 'CY', 'Asia/Famagusta': 'CY', 'Europe/Nicosia': 'CY', 'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT',
  'Europe/Zagreb': 'HR', 'Europe/Malta': 'MT', 'Atlantic/Reykjavik': 'IS', 'Europe/Chisinau': 'MD', 'Asia/Singapore': 'SG', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Hong_Kong': 'HK', 'Africa/Johannesburg': 'ZA', 'Asia/Manila': 'PH', 'America/Asuncion': 'PY', 'America/Panama': 'PA', 'Africa/Nairobi': 'KE', 'Africa/Accra': 'GH', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Kuching': 'MY', 'Africa/Lagos': 'NG', 'Indian/Mauritius': 'MU', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kigali': 'RW', 'Africa/Casablanca': 'MA',
  'Pacific/Auckland': 'NZ', 'Pacific/Chatham': 'NZ', 'America/Montevideo': 'UY', 'America/Bogota': 'CO', 'America/Santiago': 'CL',
  'America/Punta_Arenas': 'CL', 'Pacific/Easter': 'CL', 'Pacific/Honolulu': 'US', 'America/Puerto_Rico': 'US',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Phoenix': 'US',
  'America/Anchorage': 'US', 'America/Juneau': 'US', 'America/Sitka': 'US', 'America/Nome': 'US', 'America/Adak': 'US', 'America/Detroit': 'US',
  'America/Boise': 'US', 'America/Menominee': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA', 'America/Moncton': 'CA',
  'America/Glace_Bay': 'CA', 'America/Goose_Bay': 'CA', 'America/Whitehorse': 'CA', 'America/Dawson': 'CA', 'America/Iqaluit': 'CA',
  'America/Yellowknife': 'CA', 'America/Swift_Current': 'CA', 'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Merida': 'MX',
  'America/Monterrey': 'MX', 'America/Matamoros': 'MX', 'America/Chihuahua': 'MX', 'America/Ojinaga': 'MX', 'America/Mazatlan': 'MX',
  'America/Hermosillo': 'MX', 'America/Tijuana': 'MX', 'America/Bahia_Banderas': 'MX', 'America/Sao_Paulo': 'BR', 'America/Bahia': 'BR',
  'America/Fortaleza': 'BR', 'America/Recife': 'BR', 'America/Manaus': 'BR', 'America/Belem': 'BR', 'America/Cuiaba': 'BR',
  'America/Campo_Grande': 'BR', 'America/Porto_Velho': 'BR', 'America/Boa_Vista': 'BR', 'America/Rio_Branco': 'BR', 'America/Araguaina': 'BR',
  'America/Maceio': 'BR', 'America/Santarem': 'BR', 'America/Noronha': 'BR', 'America/Eirunepe': 'BR',
};
const ZONE_PREFIXES: [string, string][] = [['Australia/', 'AU'], ['America/Argentina/', 'AR'], ['America/Indiana/', 'US'], ['America/Kentucky/', 'US'], ['America/North_Dakota/', 'US']];

/** The country of a time zone, if it is one in the list. */
export function countryForTimeZone(zone: string | undefined): string | null {
  if (!zone) return null;
  const code = ZONE_COUNTRIES[zone] ?? ZONE_PREFIXES.find(([prefix]) => zone.startsWith(prefix))?.[1] ?? null;
  return code && COUNTRIES.some((country) => country.code === code) ? code : null;
}

/** A stored choice first, then the time zone, then the browser language. */
export function initialCountry(stored: string | null, zone: string | undefined, language: string): string {
  if (stored && COUNTRIES.some((country) => country.code === stored)) return stored;
  return countryForTimeZone(zone) ?? defaultCountry(language).code;
}

function readStored(): string | null {
  try {
    return localStorage.getItem(COUNTRY_KEY);
  } catch {
    return null;
  }
}

function browserZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

let current: string | null = null;
const listeners = new Set<(code: string) => void>();

export function getCountryCode(): string {
  current ??= initialCountry(readStored(), browserZone(), globalThis.navigator?.language ?? 'de');
  return current;
}

/** Stores the choice in the browser and tells everyone who shows it. */
export function setCountryCode(code: string): void {
  if (code === getCountryCode()) return;
  current = code;
  try {
    localStorage.setItem(COUNTRY_KEY, code);
  } catch {
    // The choice then only lasts until the page closes.
  }
  for (const listener of listeners) listener(code);
}

export function onCountryChange(listener: (code: string) => void): void {
  listeners.add(listener);
}
