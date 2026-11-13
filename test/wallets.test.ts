import { describe, expect, it } from 'vitest';
import { findBitcoinAddresses } from '../src/core/wallets';

describe('findBitcoinAddresses', () => {
  it('finds legacy and Bech32 addresses, each once', () => {
    const text = 'Meine Bitcoin-Adresse (BTC Wallet) lautet:18XVsPhWQVqV3Upv5svWZiHNkg4JiHxR6j\n'
      + 'Oder: bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq. Nochmals 18XVsPhWQVqV3Upv5svWZiHNkg4JiHxR6j.';
    expect(findBitcoinAddresses(text)).toEqual(['18XVsPhWQVqV3Upv5svWZiHNkg4JiHxR6j', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq']);
  });

  it('ignores words, numbers and strings with characters Base58 leaves out', () => {
    expect(findBitcoinAddresses('Überweisen Sie 1350 EUR innerhalb von 50 Stunden.')).toEqual([]);
    expect(findBitcoinAddresses('Bestellnummer 1234567890123456789012345678')).toEqual([]);
    expect(findBitcoinAddresses('10XVsPhWQVqV3Upv5svWZiHNkg4JiHxR6j')).toEqual([]);
    expect(findBitcoinAddresses('x18XVsPhWQVqV3Upv5svWZiHNkg4JiHxR6j')).toEqual([]);
  });
});
