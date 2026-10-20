import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const TOKENIZER_VERSION = '0.17.0';
export const TOKENIZER_WASM_SHA256 =
  'f204ad599c7cbfd643375c9fe94c56b521d091f136935cca31caa0c11c4e9ca2';

const commentTags = new Set(['doc_comment', 'container_doc_comment']);
const wasmUrl = new URL('../../tools/tokenizer.wasm', import.meta.url);
let compiledModule;

async function loadModule() {
  compiledModule ??= readFile(wasmUrl).then(async (bytes) => {
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== TOKENIZER_WASM_SHA256) {
      throw new Error(`Zig tokenizer WASM checksum mismatch: ${actual}`);
    }
    return WebAssembly.compile(bytes);
  });
  return compiledModule;
}

function encodeSource(source) {
  if (typeof source !== 'string')
    throw new TypeError('Zig source must be a string');
  const bytes = Buffer.from(source, 'utf8');
  if (bytes.length > 512 * 1024 * 1024)
    throw new RangeError('Zig source exceeds 512 MiB');
  return bytes;
}

// Offsets are UTF-8 bytes, matching the compiler. Lines and UTF-16 columns are
// one-based, matching JavaScript source editors; end locations are exclusive.
function lineLocator(bytes) {
  const starts = [0];
  for (let i = 0; i < bytes.length; i++)
    if (bytes[i] === 10) starts.push(i + 1);
  return (offset) => {
    let low = 0;
    let high = starts.length;
    while (low + 1 < high) {
      const middle = (low + high) >>> 1;
      if (starts[middle] <= offset) low = middle;
      else high = middle;
    }
    return {
      line: low + 1,
      column: bytes.subarray(starts[low], offset).toString('utf8').length + 1,
    };
  };
}

export async function createTokenizer() {
  const instance = await WebAssembly.instantiate(await loadModule(), {});
  const wasm = instance.exports;

  function tokens(source) {
    const bytes = encodeSource(source);
    const pointer = wasm.input_pointer(bytes.length);
    if (pointer === 0)
      throw new RangeError('Unable to grow Zig tokenizer memory');
    new Uint8Array(wasm.memory.buffer, pointer, bytes.length).set(bytes);
    wasm.begin(bytes.length);
    const result = [];
    while (wasm.next_token()) {
      const start = wasm.token_start();
      const end = wasm.token_end();
      const tag = Buffer.from(
        wasm.memory.buffer,
        wasm.tag_pointer(),
        wasm.tag_length(),
      ).toString('utf8');
      result.push({
        tag,
        text: bytes.subarray(start, end).toString('utf8'),
        start,
        end,
      });
    }
    return result;
  }

  function comments(source) {
    const bytes = encodeSource(source);
    const allTokens = tokens(source);
    const locate = lineLocator(bytes);
    const result = [];
    const append = (tag, start, end) => {
      const position = locate(start);
      const finish = locate(end);
      result.push({
        tag,
        text: bytes.subarray(start, end).toString('utf8'),
        start,
        end,
        ...position,
        endLine: finish.line,
        endColumn: finish.column,
      });
    };
    const scanGap = (start, end) => {
      for (let i = start; i + 1 < end; i++) {
        if (bytes[i] !== 47 || bytes[i + 1] !== 47) continue;
        const commentStart = i;
        while (i < end && bytes[i] !== 10) i++;
        const commentEnd = i > commentStart && bytes[i - 1] === 13 ? i - 1 : i;
        append('line_comment', commentStart, commentEnd);
      }
    };
    let previousEnd = 0;
    for (const token of allTokens) {
      scanGap(previousEnd, token.start);
      if (commentTags.has(token.tag)) append(token.tag, token.start, token.end);
      previousEnd = token.end;
    }
    scanGap(previousEnd, bytes.length);
    return result;
  }

  function assertEquivalent(original, translated) {
    const originalTokens = tokens(original).filter(
      ({ tag }) => !commentTags.has(tag),
    );
    const translatedTokens = tokens(translated).filter(
      ({ tag }) => !commentTags.has(tag),
    );
    for (
      let index = 0;
      index < Math.max(originalTokens.length, translatedTokens.length);
      index++
    ) {
      const before = originalTokens[index];
      const after = translatedTokens[index];
      if (before?.tag === after?.tag && before?.text === after?.text) continue;
      const describe = (token) =>
        token
          ? `${token.tag} ${JSON.stringify(token.text)} at byte ${token.start}`
          : 'EOF';
      const error = new Error(
        `Zig token ${index} differs: ${describe(before)} -> ${describe(after)}`,
      );
      error.code = 'ZIG_TOKEN_MISMATCH';
      error.tokenIndex = index;
      error.original = before ?? null;
      error.translated = after ?? null;
      throw error;
    }
    return true;
  }

  return { tokens, comments, assertEquivalent };
}
