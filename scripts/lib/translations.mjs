import { readFile, readdir } from 'node:fs/promises';

export async function loadStandardTranslations() {
  const directory = new URL('../../translations/std/', import.meta.url);
  const all = {};
  const files = (await readdir(directory))
    .filter((name) => /^batch-\d+\.zh\.json$/.test(name))
    .sort();
  for (const file of files) {
    const values = JSON.parse(await readFile(new URL(file, directory), 'utf8'));
    for (const [id, value] of Object.entries(values)) {
      if (id in all && all[id] !== value)
        throw new Error(`Conflicting translation: ${id}`);
      all[id] = value;
    }
  }
  return all;
}

export async function loadTranslationPolicy() {
  const directory = new URL('../../translations/std/', import.meta.url);
  const verbatim = {};
  const protectedExceptions = {};
  for (const name of (await readdir(directory)).sort()) {
    const target = /^verbatim(?:-\d+)?\.json$/.test(name)
      ? verbatim
      : /^protected-exceptions(?:-\d+)?\.json$/.test(name)
        ? protectedExceptions
        : null;
    if (!target) continue;
    const values = JSON.parse(await readFile(new URL(name, directory), 'utf8'));
    for (const [id, value] of Object.entries(values)) {
      if (id in target && JSON.stringify(target[id]) !== JSON.stringify(value))
        throw new Error(`Conflicting translation policy: ${id}`);
      target[id] = value;
    }
  }
  return { verbatim, protectedExceptions };
}

export function assertTranslationCoverage(units, translations, verbatim = {}) {
  const expected = new Set(units.map((unit) => unit.id));
  for (const unit of units) {
    const translated = translations[unit.id];
    if (typeof translated !== 'string' || !translated.trim())
      throw new Error(`Missing translation: ${unit.id}`);
    if (
      !/[\p{Script=Han}]/u.test(translated) &&
      /[A-Za-z]/.test(unit.source) &&
      !verbatim[unit.id]
    )
      throw new Error(`Untranslated prose: ${unit.id}`);
  }
  for (const id of Object.keys(translations))
    if (!expected.has(id)) throw new Error(`Unknown translation: ${id}`);
}
