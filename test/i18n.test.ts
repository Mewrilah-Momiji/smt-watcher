import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { assess } from '../src/core/assessment';
import { buildReport } from '../src/core/headers';
import { COUNTRIES } from '../src/data/reportingBodies';
import { findingText, getLang, guideTitlePart, LANGS, setLang, t } from '../src/i18n';

afterEach(() => setLang('en'));

describe('findingText', () => {
  it('fills in values in the chosen language', () => {
    const finding = { code: 'link-shortener', severity: 'note', params: { host: 'bit.ly' } } as const;
    setLang('en');
    expect(findingText(finding).detail).toContain('uses the URL shortener bit.ly');
    setLang('de');
    expect(findingText(finding).detail).toContain('Kurzlink-Dienst bit.ly');
    expect(getLang()).toBe('de');
  });

  it('leaves no value open for any finding of the spoofed test email', () => {
    const raw = readFileSync(new URL('./fixtures/spoofed.eml', import.meta.url), 'latin1').split(/\r?\n\r?\n/)[0];
    for (const lang of LANGS) {
      setLang(lang);
      for (const finding of buildReport(raw).findings) {
        expect(findingText(finding).detail).not.toContain('undefined');
      }
    }
  });
});

describe('texts', () => {
  it('uses the name and slogan of the chosen language', () => {
    expect(t().static.brand).toBe('SMT Watcher');
    expect(t().static.slogan).toBe("Spammers' beloved foe");
    setLang('de');
    expect(t().static.brand).toBe('SMT Wächter');
    expect(t().static.slogan).toBe('Der Lieblingsfeind der Spammer');
  });

  it('writes every guide title as "program, kind", so that the guide can group by program', () => {
    expect(guideTitlePart('Gmail, headers', 'program')).toBe('Gmail');
    expect(guideTitlePart('Gmail, headers', 'kind')).toBe('headers');
    for (const lang of LANGS) {
      setLang(lang);
      const titles = Object.entries(t().static).filter(([key]) => /^guide.+Title$/.test(key));
      expect(titles.length).toBe(12);
      for (const [key, title] of titles) expect(title, `${lang} ${key}`).toMatch(/^[^,]+.*, [^,]+$/);
    }
  });

  it('names every country and report language in every language', () => {
    for (const lang of LANGS) {
      setLang(lang);
      for (const { code } of COUNTRIES) expect(t().country[code]).toBeTruthy();
      // Brazil has its own report language, though the page has no Brazilian version.
      expect(Object.keys(t().reportLanguages).sort()).toEqual([...LANGS, 'pt-BR', 'ja', 'ko'].sort());
      expect(t().static.translationLink).toBeTruthy();
    }
  });

  it('never calls the lowest level an all-clear', () => {
    expect(t().assessment['no-signs'].detail).toContain('not an all-clear');
    setLang('de');
    expect(t().assessment['no-signs'].detail).toContain('keine Entwarnung');
    expect(t().scale.low).toBe('Unauffällig');
    expect(assess([]).level).toBe('no-signs');
  });
});
