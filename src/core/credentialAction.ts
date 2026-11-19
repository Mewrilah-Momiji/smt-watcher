import type { MailContent } from './content';
import { baseDomain } from './findings';

const PERSONALIZED_ACCOUNT_ACTION = /^(?:upgrade|validate|verify|confirm)\s+(?:your\s+)?(?:e-?mail(?:\s+address)?|account)$/i;
const REJECTED_PAYMENT = /\b(?:cobro|pago)\b.{0,45}\b(?:rechazad[oa]|denegad[oa]|fallid[oa])\b/i;
const PAYMENT_ACTION = /^(?:concluir|completar|finalizar|reintentar|actualizar|continuar|pagar)(?: (?:el )?pago| ahora| con el pago)?$/i;
const DELIVERY_DOMAINS = new Set([
  'exct.net', 'exacttarget.com', 'sendgrid.net', 'cordial.io', 'mailchimp.com', 'list-manage.com',
  'campaign-archive.com', 'cmail19.com', 'responsys.net', 'constantcontact.com', 'rs6.net',
  'mailgun.org', 'mandrillapp.com', 'sailthru.com', 'cmail20.com', 'emltrk.com',
]);

const CALLBACK_BRAND = /\b(paypal|amazon|apple|microsoft|netflix|norton|mcafee|geek squad)\b/i;
const CHARGE = /(?:processing charge|charged|transaction|payment|invoice|purchase).{0,100}(?:[$€£]\s*\d|\b\d+(?:[.,]\d+)?\s*(?:USD|EUR|GBP)\b)/i;
const CALL = /\b(?:call|phone|contact)\b/i;
const DISPUTE = /\b(?:cancel|dispute|did not (?:apply|authorize|purchase|place)|unauthori[sz]ed|identity theft)\b/i;
const PHONE = /(?<!\w)(?:\+\d{1,3}[ .-]+)?\(?\d{2,4}\)?[ .-]+\d{2,4}[ .-]+\d{3,4}(?!\w)/g;

const ENTITIES = new Map([
  ['amp', '&'], ['apos', "'"], ['quot', '"'], ['nbsp', ' '], ['lt', '<'], ['gt', '>'],
  ['shy', ''], ['eacute', 'é'], ['agrave', 'à'],
]);

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return ENTITIES.get(name) ?? entity;
    const hex = name[1].toLowerCase() === 'x';
    const code = parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

function normalize(text: string): string {
  return decodeEntities(text).replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim();
}

function httpUrl(href: string): URL | null {
  try {
    const url = new URL(decodeEntities(href).trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function* htmlActions(html: string): Iterable<{ label: string; href: string }> {
  let anchor: { href: string; text: string[] } | undefined;
  const visibleHtml = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  for (const [token] of visibleHtml.matchAll(/<(?:"[^"]*"|'[^']*'|[^<>"'])*>|[^<]+/g)) {
    if (/^<a\b/i.test(token)) {
      const href = /\s+href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(token);
      anchor = href ? { href: href[1] ?? href[2] ?? href[3], text: [] } : undefined;
    } else if (/^<\/a\s*>/i.test(token)) {
      if (anchor) yield { href: anchor.href, label: normalize(anchor.text.join(' ')) };
      anchor = undefined;
    } else if (anchor && !token.startsWith('<')) {
      const text = decodeEntities(token).trim();
      if (text) anchor.text.push(text);
    }
  }
}

/** Checks the actual button for a personalized account link or an off-domain payment action. */
export function externalAccountActions(content: MailContent, fromDomain: string, recipients: string[]): Record<string, string> {
  const html = content.bodyHtml ?? '';
  const personalized = recipients.length > 0 && /email(?:=|&#0*61;|&#x0*3d;)/i.test(html);
  const rejectedPayment = /\b(?:rechazad|denegad|fallid)/i.test(html)
    && REJECTED_PAYMENT.test(normalize((content.subject ?? '') + ' ' + html.replace(/<[^<>]*>/g, ' ')));
  const params: Record<string, string> = {};
  if (!personalized && !rejectedPayment) return params;

  const addresses = new Set(recipients.map((address) => address.toLowerCase()));
  const mailDomains = new Set([baseDomain(fromDomain), ...recipients.map((address) => baseDomain(address.split('@').at(-1)!))]);
  for (const { label, href } of htmlActions(html)) {
    const accountButton = personalized && PERSONALIZED_ACCOUNT_ACTION.test(label);
    const paymentButton = rejectedPayment && PAYMENT_ACTION.test(label);
    if (!accountButton && !paymentButton) continue;
    const url = httpUrl(href);
    if (!url) continue;
    const host = url.hostname.replace(/\.$/, '');
    const domain = baseDomain(host);
    if (mailDomains.has(domain)) continue;
    if (paymentButton && !DELIVERY_DOMAINS.has(domain)) params.rejectedPaymentHost ??= host;
    if (accountButton) {
      for (const [key, value] of url.searchParams) {
        if (key.toLowerCase() === 'email' && addresses.has(value.trim().toLowerCase())) params.recipientActionHost ??= host;
      }
    }
  }
  return params;
}

/** Checks for a branded charge followed by a request to dispute it by phone. `sentByBrand` uses the brand list's own domains. */
export function unexpectedChargeCallback(content: MailContent, sentByBrand: (brand: string) => boolean): string | null {
  const brand = CALLBACK_BRAND.exec(content.subject ?? '')?.[1].toLowerCase();
  if (!brand || sentByBrand(brand)) return null;

  for (const body of [content.bodyText ?? '', (content.bodyHtml ?? '').replace(/<[^<>]*>/g, ' ')]) {
    const text = normalize(body);
    if (!CHARGE.test(text)) continue;
    for (const number of text.matchAll(PHONE)) {
      const context = text.slice(Math.max(0, number.index - 150), number.index + number[0].length + 105);
      if (CALL.test(context) && DISPUTE.test(context)) return brand;
    }
  }
  return null;
}
