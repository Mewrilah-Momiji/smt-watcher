/** Services that send for many shops under their own signature, so the shop's name and a numbered address are normal there. */
export const SENDING_PLATFORMS = ['trustedshops.com', 'shopifyemail.com'];

export interface Brand {
  /** As it appears in a sender's name, in lower case. */
  name: string;
  /** Base domains the brand really uses besides its name. */
  domains: string[];
  /** Many own domains, such as one per regional bank, so the name may be part of a longer domain. */
  manyDomains?: boolean;
}

/**
 * Brand names often imitated in phishing. A domain must be the brand's name, as hellweg-angebote.example is not Hellweg.
 * Kept in the page rather than the database, so that the check works offline and in the mail program.
 */
export const BRANDS: Brand[] = [
  { name: 'paypal', domains: [] },
  { name: 'sumup', domains: [] },
  { name: 'stripe', domains: [] },
  { name: 'edeka', domains: [], manyDomains: true },
  { name: 'hellweg', domains: [] },
  { name: 'obi', domains: [] },
  { name: 'mastercard', domains: [] },
  { name: 'eurojackpot', domains: ['lotto.de'] },
  { name: 'süddeutsche zeitung', domains: ['sz.de', 'sueddeutsche.de'] },
  { name: 'byd', domains: [] },
  { name: 'ninjatrader', domains: [] },
  { name: 'prime membership', domains: ['amazon.com', 'amazon.de'] },
  { name: 'セゾン', domains: ['saisoncard.co.jp', 'saison.co.jp'] },
  { name: 'netアンサー', domains: ['saisoncard.co.jp', 'saison.co.jp'] },
  { name: 'sparkasse', domains: ['s-mxs.de'], manyDomains: true },
  { name: 'volksbank', domains: ['vr.de', 'vrbank.de'], manyDomains: true },
  { name: 'postbank', domains: ['db.com'] },
  { name: 'commerzbank', domains: [] },
  { name: 'deutsche bank', domains: ['db.com', 'deutsche-bank.de'] },
  { name: 'dkb', domains: [] },
  { name: 'dhl', domains: ['deutschepost.de'] },
  { name: 'amazon', domains: [], manyDomains: true },
  { name: 'telekom', domains: ['t-online.de'] },
  { name: 'vodafone', domains: [] },
  { name: 'netflix', domains: [] },
  { name: 'apple', domains: ['icloud.com'] },
  { name: 'microsoft', domains: ['outlook.com', 'office.com', 'live.com'] },
  { name: 'ebay', domains: [] },
  { name: 'klarna', domains: [] },
  { name: 'icloud', domains: ['apple.com'] },
  { name: 'applecare', domains: ['apple.com'] },
  { name: 'consorsbank', domains: [] },
  { name: 'comdirect', domains: [] },
  { name: 'lidl', domains: [] },
  { name: 'aldi', domains: [], manyDomains: true },
  { name: 'denic', domains: [] },
  { name: 'elster', domains: [] },
  { name: 'rakuten', domains: [] },
  { name: '楽天', domains: ['rakuten.co.jp', 'rakuten.com'] },
  { name: '国税庁', domains: ['nta.go.jp', 'e-tax.nta.go.jp'] },
  { name: 'e-tax', domains: ['nta.go.jp'] },
  // Japanese credit card, added on 2026-11-11: 17 of 262 private spam emails with both spellings, none of the owner's legitimate emails.
  { name: 'saison', domains: ['saisoncard.co.jp'] },
  { name: 'セゾン', domains: ['saisoncard.co.jp'] },
  // Added on 2026-11-11 after a fake "OpenAl" billing email. Together with lookalike letters: 1 of 263 private spam emails and 6 in the public collections, none of 1872 legitimate emails or 5149 Apache list emails.
  { name: 'openai', domains: ['chatgpt.com'] },
  { name: 'chatgpt', domains: ['openai.com'] },
  // Imitated in the public Nazario phishing corpus of 2025, added on 2026-11-04. None appears in the owner's legitimate emails.
  { name: 'docusign', domains: [] },
  { name: 'walmart', domains: [] },
  { name: 'roundcube', domains: [] },
  { name: 'norton', domains: ['nortonlifelock.com', 'gen.digital'] },
  { name: 'mcafee', domains: [] },
  { name: 'geek squad', domains: ['bestbuy.com'] },
  { name: 'coinbase', domains: [] },
  { name: 'wells fargo', domains: [] },
  { name: 'bank of america', domains: ['bofa.com'] },
  { name: 'usps', domains: [] },
  { name: 'fedex', domains: [] },
  { name: 'ups', domains: [] },
  { name: 'office 365', domains: ['microsoft.com', 'office.com', 'outlook.com'] },
  { name: 'sharepoint', domains: ['microsoft.com', 'sharepointonline.com'] },
  { name: 'onedrive', domains: ['microsoft.com', 'live.com'] },
  { name: 'adobe', domains: [] },
  { name: 'dropbox', domains: ['dropboxmail.com'] },
  { name: 'wetransfer', domains: [] },
  // Crypto wallets imitated in the Phishing Pot corpus, added on 2026-11-04. Exodus stays out, as another sender of that name caused false alarms in the private test set.
  { name: 'metamask', domains: ['consensys.io', 'consensys.net'] },
  { name: 'ledger', domains: [] },
  { name: 'trezor', domains: ['satoshilabs.com'] },
];
