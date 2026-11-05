import { afterEach, describe, expect, it } from 'vitest';
import { ADVICE_SOURCES, hasUnsubscribeHeader } from '../src/core/senderAdvice';
import { LANGS, setLang, t } from '../src/i18n';

afterEach(() => setLang('en'));

describe('senderAdvice', () => {
  it('only links to secure pages', () => {
    for (const url of Object.values(ADVICE_SOURCES)) expect(url).toMatch(/^https:\/\//);
  });

  it('finds the unsubscribe header', () => {
    expect(hasUnsubscribeHeader('From: a@example.com\r\nList-Unsubscribe: <https://example.com/u>\r\n')).toBe(true);
    expect(hasUnsubscribeHeader('From: a@example.com\r\n')).toBe(false);
  });

  it('gives the same number of short tips in every language', () => {
    for (const lang of LANGS) {
      setLang(lang);
      expect(t().senderAdvice.tips).toHaveLength(6);
      for (const tip of t().senderAdvice.tips) expect(tip.length).toBeLessThan(110);
    }
  });
});
