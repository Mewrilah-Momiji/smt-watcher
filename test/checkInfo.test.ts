import { describe, expect, it } from 'vitest';
import { CHECK_INFO } from '../src/checkInfo';
import { LANGS } from '../src/i18n';

describe('list of what the check looks at', () => {
  it('has a title and as many points as English in every language', () => {
    for (const lang of LANGS) {
      expect(CHECK_INFO[lang].title, lang).not.toBe('');
      expect(CHECK_INFO[lang].points, lang).toHaveLength(CHECK_INFO.en.points.length);
    }
  });

  it('is translated, not copied from English', () => {
    for (const lang of LANGS.filter((code) => code !== 'en')) {
      expect(CHECK_INFO[lang].title, lang).not.toBe(CHECK_INFO.en.title);
    }
  });
});
