import { mkdir, writeFile } from 'node:fs/promises';
import { loadRuntime } from './lib/std-runtime.mjs';
import { createTokenizer } from './lib/tokenizer.mjs';
import { collectCommentUnits } from './lib/comments.mjs';

const runtime = await loadRuntime();
const tokenizer = await createTokenizer();
const { units } = collectCommentUnits(runtime.files, tokenizer);
await mkdir(new URL('../translations/std/', import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL('../translations/std/catalog.json', import.meta.url),
  `${JSON.stringify({ version: '0.17.0', units }, null, 2)}\n`,
);
const buckets = [[], [], []];
const sizes = [0, 0, 0];
for (const unit of [...units].sort(
  (a, b) => b.source.length - a.source.length,
)) {
  const bucket = sizes.indexOf(Math.min(...sizes));
  buckets[bucket].push(unit);
  sizes[bucket] += unit.source.length;
}
for (let index = 0; index < buckets.length; index++)
  await writeFile(
    new URL(
      `../translations/std/batch-${index + 1}.source.json`,
      import.meta.url,
    ),
    `${JSON.stringify(buckets[index], null, 2)}\n`,
  );
console.log(
  JSON.stringify(
    {
      units: units.length,
      characters: units.reduce((sum, unit) => sum + unit.source.length, 0),
      batches: sizes,
    },
    null,
    2,
  ),
);
