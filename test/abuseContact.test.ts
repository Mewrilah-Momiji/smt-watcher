import { describe, expect, it, vi } from 'vitest';
import { findAbuseAddresses, lookUpAbuseContact, rdapUrl } from '../src/core/abuseContact';

const entity = (roles: string[], email: unknown, entities: unknown[] = []) => ({
  roles,
  vcardArray: ['vcard', [['version', {}, 'text', '4.0'], ['email', {}, 'text', email]]],
  entities,
});

describe('findAbuseAddresses', () => {
  it('finds abuse addresses at any depth, without duplicates', () => {
    const rdap = { entities: [entity(['registrant'], 'owner@net.example', [entity(['abuse'], 'Abuse@Net.example'), entity(['abuse', 'technical'], 'abuse@net.example')])] };
    expect(findAbuseAddresses(rdap)).toEqual(['abuse@net.example']);
  });

  it('ignores other roles', () => {
    expect(findAbuseAddresses({ entities: [entity(['technical'], 'noc@net.example')] })).toEqual([]);
  });

  it.each(['not an address', 'a@b', 'x@y.example?bcc=z@y.example', 'a b@c.example', '"a"@c.example', 42])('rejects %s', (email) => {
    expect(findAbuseAddresses({ entities: [entity(['abuse'], email)] })).toEqual([]);
  });

  it.each([null, 'text', {}, { entities: 'x' }, { entities: [null, { roles: ['abuse'] }, { roles: ['abuse'], vcardArray: 'x' }] }])('copes with the unexpected answer %j', (rdap) => {
    expect(findAbuseAddresses(rdap)).toEqual([]);
  });
});

describe('lookUpAbuseContact', () => {
  const answer = (body: unknown, url: string, status = 200) => {
    const response = new Response(JSON.stringify(body), { status });
    Object.defineProperty(response, 'url', { value: url });
    return response;
  };

  it('sends only the IP address, without cookies or referrer', async () => {
    const fetcher = vi.fn(async () => answer({ entities: [entity(['abuse'], 'abuse@net.example')] }, 'https://rdap.db.ripe.net/ip/198.51.100.7'));
    const contact = await lookUpAbuseContact('198.51.100.7', fetcher as unknown as typeof fetch);
    expect(contact).toEqual({ addresses: ['abuse@net.example'], networkContact: false, registry: 'RIPE' });
    expect(fetcher).toHaveBeenCalledWith(
      'https://rdap.org/ip/198.51.100.7',
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
    );
  });

  it('falls back to a marked network contact and names the national registry', async () => {
    const fetcher = async () => answer({ entities: [entity(['administrative', 'technical'], 'noc@net.example')] }, 'https://twnic.rdap.apnic.net/ip/198.51.100.7');
    expect(await lookUpAbuseContact('198.51.100.7', fetcher as unknown as typeof fetch)).toEqual({ addresses: ['noc@net.example'], networkContact: true, registry: 'TWNIC' });
  });

  it('prefers the abuse address and never offers the registrant', async () => {
    const both = async () => answer({ entities: [entity(['technical'], 'noc@net.example'), entity(['abuse'], 'abuse@net.example')] }, 'https://rdap.registro.br/ip/198.51.100.7');
    expect(await lookUpAbuseContact('198.51.100.7', both as unknown as typeof fetch)).toEqual({ addresses: ['abuse@net.example'], networkContact: false, registry: 'NIC.br' });
    const registrant = async () => answer({ entities: [entity(['registrant'], 'owner@net.example')] }, 'https://rdap.arin.net/ip/198.51.100.7');
    expect(await lookUpAbuseContact('198.51.100.7', registrant as unknown as typeof fetch)).toEqual({ addresses: [], networkContact: false, registry: 'ARIN' });
  });

  it('fails on an error answer', async () => {
    const fetcher = async () => answer({}, 'https://rdap.org/ip/198.51.100.7', 404);
    await expect(lookUpAbuseContact('198.51.100.7', fetcher as unknown as typeof fetch)).rejects.toThrow();
  });

  it('escapes the IP address in the address', () => {
    expect(rdapUrl('2001:db8::1')).toBe('https://rdap.org/ip/2001%3Adb8%3A%3A1');
  });
});
