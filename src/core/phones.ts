import { isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

/** "Another country" and unknown codes have no national format. */
function asCountry(country: string | undefined): CountryCode | undefined {
  return country && isSupportedCountry(country) ? country : undefined;
}

export interface PhoneCandidate {
  /** As written in the email. */
  raw: string;
  /** Digits with country code, such as +499001234567. */
  normalized: string;
  /** The surrounding text mentions calling, so this is probably a phone number. */
  hasContext: boolean;
}

const MAX_CANDIDATES = 20;
const CONTEXT_PATTERN = /\b(tel|telefon|telefonnummer|phone|rufnummer|hotline|anrufen|anruf|call|fax|mobil|mobile|handy|whatsapp|sms|kontakt|contact)\b/i;
const CANDIDATE_PATTERN = /(?<![\w.,@/=-])(?:\+|00)?\d(?:[ \-/.()]{0,2}\d){6,17}(?![\w@]|[.,-]\d)/g;
const DATE_PATTERN = /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})/;

/** Reduces HTML to plain text for searching. The result is never rendered as HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/tr|\/li)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#43;|&plus;/gi, '+');
}

/**
 * Reads a number in the national format of the given country, or in international format with + or 00.
 * Without a country, only international numbers count. Returns E.164, such as +499001234567.
 */
function normalize(raw: string, country?: CountryCode): string | null {
  const digits = raw.replace(/\D/g, '');
  const international = raw.startsWith('+') ? digits : digits.startsWith('00') ? digits.slice(2) : null;
  if (international === null && !country) return null;
  // Placeholders such as 0000000000 or 1111111.
  if (/^(\d)\1+$/.test(digits.replace(/^0+/, '') || '0')) return null;

  const parsed = parsePhoneNumberFromString(international === null ? raw : `+${international}`, country);
  // The full metadata checks the number ranges of each country, so order or customer numbers rarely pass.
  return parsed?.isValid() ? parsed.number : null;
}

/** Checks a number the user typed. Returns it in the format the forms expect, or null if it is not valid. */
export function parsePhoneInput(input: string, country?: string): string | null {
  const raw = input.trim();
  return /^\+?[\d\s\-/.()]+$/.test(raw) ? normalize(raw, asCountry(country)) : null;
}

/** Finds possible phone numbers. The user confirms them, as digits alone are never conclusive. */
export function findPhoneCandidates(text: string, country?: string): PhoneCandidate[] {
  const code = asCountry(country);
  const byNumber = new Map<string, PhoneCandidate>();

  for (const line of text.split(/\r?\n/)) {
    const cleaned = line
      .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, ' ')
      .replace(/\bwww\.\S+/gi, ' ')
      .replace(/\S+@\S+/g, ' ');

    for (const match of cleaned.matchAll(CANDIDATE_PATTERN)) {
      const raw = match[0].trim();
      if (DATE_PATTERN.test(raw)) continue;
      const normalized = normalize(raw, code);
      if (!normalized) continue;

      const hasContext = CONTEXT_PATTERN.test(cleaned);
      const existing = byNumber.get(normalized);
      if (existing) existing.hasContext ||= hasContext;
      else byNumber.set(normalized, { raw, normalized, hasContext });
    }
  }

  return [...byNumber.values()]
    .sort((a, b) => Number(b.hasContext) - Number(a.hasContext))
    .slice(0, MAX_CANDIDATES);
}
