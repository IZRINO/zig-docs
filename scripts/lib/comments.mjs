import { createHash } from 'node:crypto';

function translatable(text) {
  if (!/[A-Za-z]{2,}/.test(text)) return false;
  if (
    /^\s*(?:zig fmt: (?:on|off)|SPDX-License-Identifier:|Copyright\b)/.test(
      text,
    )
  )
    return false;
  if (/^\s*(?:https?:\/\/\S+\s*)+$/.test(text)) return false;
  return true;
}

export function collectCommentUnits(files, tokenizer) {
  const unitsById = new Map();
  const groups = new Map();
  for (const [path, buffer] of files) {
    if (!path.endsWith('.zig')) continue;
    const comments = tokenizer.comments(buffer.toString('utf8'));
    const fileGroups = [];
    for (const comment of comments) {
      const marker = comment.text.match(/^\/\/[/!]?/)[0];
      const body = comment.text.slice(marker.length).replace(/^ /, '');
      const previous = fileGroups.at(-1);
      const between = previous
        ? buffer.subarray(previous.end, comment.start).toString()
        : null;
      if (
        previous &&
        marker === previous.marker &&
        /^\r?\n[ \t]*$/.test(between)
      ) {
        previous.comments.push({ ...comment, marker });
        previous.lines.push(body);
        previous.end = comment.end;
      } else {
        fileGroups.push({
          start: comment.start,
          end: comment.end,
          marker,
          comments: [{ ...comment, marker }],
          lines: [body],
        });
      }
    }
    for (const group of fileGroups) {
      group.source = group.lines.join('\n');
      if (!translatable(group.source)) continue;
      group.id = createHash('sha256')
        .update(group.source)
        .digest('hex')
        .slice(0, 20);
      if (!unitsById.has(group.id))
        unitsById.set(group.id, {
          id: group.id,
          source: group.source,
          kind: group.marker,
          locations: [],
        });
      unitsById
        .get(group.id)
        .locations.push({ path, line: group.comments[0].line });
    }
    groups.set(
      path,
      fileGroups.filter((group) => group.id),
    );
  }
  return { units: [...unitsById.values()], groups };
}

function protectedParts(text, tokenizer) {
  const result = { fences: [], inline: [] };
  for (const [part] of text.matchAll(
    /```[^\n]*\n[\s\S]*?```|`[^`\n]+`|https?:\/\/[^\s<>\p{Script=Han}，。；：！？、）]+/gu,
  )) {
    const fenced = part.match(/^```(zig)?\s*\n([\s\S]*?)```$/);
    if (!fenced) {
      if (part.startsWith('```')) result.fences.push(part);
      else if (part.startsWith('http')) {
        let url = part.replace(/[.,;:!?，。；：！？、）]+$/u, '');
        for (const [open, close] of [
          ['(', ')'],
          ['[', ']'],
        ]) {
          const count = (char) =>
            [...url].filter((value) => value === char).length;
          while (url.endsWith(close) && count(close) > count(open))
            url = url.slice(0, -1);
        }
        result.inline.push(url);
      } else result.inline.push(part);
      continue;
    }
    const tokens = tokenizer
      .tokens(fenced[2])
      .filter(
        ({ tag }) => tag !== 'doc_comment' && tag !== 'container_doc_comment',
      );
    result.fences.push({
      language: fenced[1] ?? '',
      tokens: tokens.map(({ tag, text }) => [tag, text]),
    });
  }
  result.inline.sort();
  return result;
}

export function validateCommentTranslation(
  group,
  translation,
  tokenizer,
  protectedExceptions = {},
) {
  if (typeof translation !== 'string' || !translation.trim())
    throw new Error(`Missing translation: ${group.id}`);
  const sourceProtected = protectedParts(group.source, tokenizer);
  const translatedProtected = protectedParts(translation, tokenizer);
  if (JSON.stringify(sourceProtected) !== JSON.stringify(translatedProtected)) {
    const exception = protectedExceptions[group.id];
    const sha = (value) => createHash('sha256').update(value).digest('hex');
    if (
      !exception?.reason ||
      exception.sourceSha256 !== sha(group.source) ||
      exception.translationSha256 !== sha(translation)
    )
      throw new Error(`Modified protected code or URL: ${group.id}`);
  }
  const lines = translation.replaceAll('\r\n', '\n').split('\n');
  const lineCount = group.source.split('\n').length;
  if (lines.length > lineCount)
    throw new Error(`Translation changes source line count: ${group.id}`);
  while (lines.length < lineCount) lines.push('');
  return lines;
}

export function translateSources(
  files,
  groups,
  translations,
  tokenizer,
  protectedExceptions = {},
) {
  const translatedFiles = new Map();
  for (const [path, original] of files) {
    let bytes = original;
    for (const group of [...(groups.get(path) ?? [])].reverse()) {
      const lines = validateCommentTranslation(
        group,
        translations[group.id],
        tokenizer,
        protectedExceptions,
      );
      for (let index = group.comments.length - 1; index >= 0; index--) {
        const comment = group.comments[index];
        const replacement = Buffer.from(
          `${comment.marker}${lines[index] ? ` ${lines[index]}` : ''}`,
        );
        bytes = Buffer.concat([
          bytes.subarray(0, comment.start),
          replacement,
          bytes.subarray(comment.end),
        ]);
      }
    }
    if (path.endsWith('.zig'))
      tokenizer.assertEquivalent(original.toString(), bytes.toString());
    if (
      original.toString().split('\n').length !==
      bytes.toString().split('\n').length
    )
      throw new Error(`Source line count changed: ${path}`);
    translatedFiles.set(path, bytes);
  }
  return translatedFiles;
}

export function writeTar(files) {
  const blocks = [];
  for (const [path, bytes] of files) {
    if (Buffer.byteLength(path) > 100)
      throw new Error(`Tar entry path too long: ${path}`);
    const header = Buffer.alloc(512);
    header.write(path);
    header.write('0000644\0', 100);
    header.write('0000000\0', 108);
    header.write('0000000\0', 116);
    header.write(`${bytes.length.toString(8).padStart(11, '0')}\0`, 124);
    header.write('00000000000\0', 136);
    header.fill(32, 148, 156);
    header[156] = 48;
    header.write('ustar\0', 257);
    header.write('00', 263);
    const checksum = header.reduce((sum, value) => sum + value, 0);
    header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148);
    blocks.push(
      header,
      bytes,
      Buffer.alloc((512 - (bytes.length % 512)) % 512),
    );
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}
