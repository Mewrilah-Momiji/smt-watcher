// Legacy addresses start with 1 or 3 and use Base58, which leaves out 0, O, I and l. Newer ones start with bc1 and use Bech32.
const BITCOIN_PATTERN = /(?<![A-Za-z0-9])(bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})(?![A-Za-z0-9])/g;

/**
 * Bitcoin addresses named in the text, each once, in the order they appear.
 * Only meant for emails already found to demand payment, as the pattern does not check the address's checksum.
 */
export function findBitcoinAddresses(text: string): string[] {
  return [...new Set([...text.matchAll(BITCOIN_PATTERN)].map((match) => match[1]))];
}
