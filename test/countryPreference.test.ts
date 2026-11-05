import { describe, expect, it } from 'vitest';
import { countryForTimeZone, initialCountry } from '../src/countryPreference';

describe('countryForTimeZone', () => {
  it('knows the time zones of the listed countries', () => {
    expect(countryForTimeZone('Europe/Berlin')).toBe('DE');
    expect(countryForTimeZone('Europe/Vienna')).toBe('AT');
    expect(countryForTimeZone('America/Toronto')).toBe('CA');
    expect(countryForTimeZone('America/Argentina/Cordoba')).toBe('AR');
    expect(countryForTimeZone('Australia/Sydney')).toBe('AU');
    expect(countryForTimeZone('America/Indiana/Indianapolis')).toBe('US');
    expect(countryForTimeZone('Asia/Kolkata')).toBe('IN');
    expect(countryForTimeZone('Asia/Tokyo')).toBe('JP');
    expect(countryForTimeZone('Asia/Seoul')).toBe('KR');
    expect(countryForTimeZone('Asia/Hong_Kong')).toBe('HK');
    expect(countryForTimeZone('Africa/Johannesburg')).toBe('ZA');
    expect(countryForTimeZone('Asia/Manila')).toBe('PH');
    expect(countryForTimeZone('America/Asuncion')).toBe('PY');
    expect(countryForTimeZone('America/Panama')).toBe('PA');
    expect(countryForTimeZone('Africa/Nairobi')).toBe('KE');
    expect(countryForTimeZone('Africa/Accra')).toBe('GH');
    expect(countryForTimeZone('Asia/Kuala_Lumpur')).toBe('MY');
    expect(countryForTimeZone('Africa/Lagos')).toBe('NG');
    expect(countryForTimeZone('Indian/Mauritius')).toBe('MU');
    expect(countryForTimeZone('Africa/Dar_es_Salaam')).toBe('TZ');
    expect(countryForTimeZone('Africa/Kigali')).toBe('RW');
    expect(countryForTimeZone('Africa/Casablanca')).toBe('MA');
  });

  it('knows nothing about other zones', () => {
    expect(countryForTimeZone('Asia/Bangkok')).toBeNull();
    expect(countryForTimeZone(undefined)).toBeNull();
  });
});

describe('initialCountry', () => {
  it('prefers a stored choice, then the time zone, then the browser language', () => {
    expect(initialCountry('CH', 'Europe/Berlin', 'de-DE')).toBe('CH');
    expect(initialCountry(null, 'Europe/Vienna', 'de-DE')).toBe('AT');
    expect(initialCountry(null, 'Asia/Bangkok', 'en-GB')).toBe('GB');
    expect(initialCountry(null, undefined, 'fr')).toBe('FR');
  });

  it('ignores a stored code that is no longer in the list', () => {
    expect(initialCountry('ZZ', 'Europe/Berlin', 'en')).toBe('DE');
  });
});
