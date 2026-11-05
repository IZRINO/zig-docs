import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function translateGrammar(source, translation) {
  assert.equal(
    sha256(source),
    translation.sourceHash,
    'Grammar source hash changed',
  );
  const verbatim = new Set(translation.verbatimComments);
  const used = new Set();
  const translated = source
    .split('\n')
    .map((line) => {
      if (!line.startsWith('# ')) return line;
      const comment = line.slice(2);
      used.add(comment);
      if (verbatim.has(comment)) return line;
      const text = translation.comments[comment];
      assert.equal(
        typeof text,
        'string',
        `Missing grammar translation: ${comment}`,
      );
      assert.match(
        text,
        /\p{Script=Han}/u,
        `Untranslated grammar comment: ${comment}`,
      );
      assert.ok(
        !/[\r\n]/.test(text),
        `Multiline grammar translation: ${comment}`,
      );
      return `# ${text}`;
    })
    .join('\n');
  assert.deepEqual(
    new Set([...Object.keys(translation.comments), ...verbatim]),
    used,
    'Grammar translation inventory differs from the snapshot',
  );
  return translated;
}

export async function readGrammar() {
  const snapshot = JSON.parse(
    await readFile(
      new URL('upstream/intro/grammar/manifest.json', root),
      'utf8',
    ),
  );
  for (const asset of snapshot.assets) {
    const bytes = await readFile(
      new URL(`upstream/intro/grammar/${asset.file}`, root),
    );
    assert.equal(
      bytes.length,
      asset.bytes,
      `Grammar snapshot size: ${asset.file}`,
    );
    assert.equal(
      sha256(bytes),
      asset.sha256,
      `Grammar snapshot checksum: ${asset.file}`,
    );
  }
  const source = await readFile(
    new URL('upstream/intro/grammar/grammar.peg', root),
    'utf8',
  );
  const translation = JSON.parse(
    await readFile(
      new URL('translations/intro/grammar.zh-cn.json', root),
      'utf8',
    ),
  );
  return {
    snapshot,
    source,
    translation,
    translated: translateGrammar(source, translation),
  };
}
