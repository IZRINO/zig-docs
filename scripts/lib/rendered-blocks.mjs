import { createHash } from 'node:crypto';

const sha = (text) => createHash('sha256').update(text).digest('hex');
const fences = (text) =>
  [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((match) => match[1]);

// Approvals bind the whole reviewed comment and each rendered block to its
// source module. They never exempt source listings or other code examples.
export function approvedRenderedTextBlocks(units, translations, exceptions) {
  const approved = new Map();
  for (const unit of units) {
    const policy = exceptions[unit.id];
    if (!policy?.renderedTextBlocks) continue;
    const translation = translations[unit.id];
    if (
      !policy.reason ||
      policy.sourceSha256 !== sha(unit.source) ||
      typeof translation !== 'string' ||
      policy.translationSha256 !== sha(translation)
    )
      throw new Error(`Stale rendered text approval: ${unit.id}`);
    const original = fences(unit.source);
    const translated = fences(translation);
    if (!original.length || original.length !== translated.length)
      throw new Error(`Rendered text fence count: ${unit.id}`);
    for (const { path } of unit.locations) {
      const pairs = approved.get(path) ?? new Set();
      for (let index = 0; index < original.length; index++)
        pairs.add(JSON.stringify([original[index], translated[index]]));
      approved.set(path, pairs);
    }
  }
  return approved;
}

export function assertRenderedBlockEquivalent(
  original,
  translated,
  tokenizer,
  approved,
  { sourcePath, documentId, index, sourceListing = false },
) {
  if (
    !sourceListing &&
    approved.get(sourcePath)?.has(JSON.stringify([original, translated]))
  )
    return true;
  try {
    return tokenizer.assertEquivalent(original, translated);
  } catch (cause) {
    throw new Error(`Code block ${documentId}[${index}]: ${cause.message}`, {
      cause,
    });
  }
}
