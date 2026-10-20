import { readFile } from 'node:fs/promises';

export const categories = [
  'namespace',
  'container',
  'variable',
  'function',
  'primitive',
  'error-set',
  'constant',
  'alias',
  'type',
  'type-type',
  'type-function',
];

export function readTar(archive) {
  const files = new Map();
  for (let offset = 0; offset + 512 <= archive.length; ) {
    const header = archive.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString().split('\0')[0];
    if (!name) break;
    const size =
      parseInt(
        header.subarray(124, 136).toString().replaceAll('\0', '').trim(),
        8,
      ) || 0;
    const prefix = header.subarray(345, 500).toString().split('\0')[0];
    const path = prefix ? `${prefix}/${name}` : name;
    if (size > archive.length - offset - 512)
      throw new Error(`Truncated tar entry: ${path}`);
    if (header[156] === 0 || header[156] === 48)
      files.set(path, archive.subarray(offset + 512, offset + 512 + size));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

export function symbolHref(name, symbolPages, locale) {
  const target = symbolPages.get(name) ?? symbolPages.resolve?.(name);
  if (!target) return null;
  const { page, anchor } =
    typeof target === 'string' ? { page: target, anchor: name } : target;
  return `/zig-docs/${locale}/${page.split('/').map(encodeURIComponent).join('/')}/#${encodeURIComponent(anchor)}`;
}

export async function loadRuntime(archiveOverride) {
  const root = new URL('../../upstream/0.17.0/std/', import.meta.url);
  const [wasm, archive] = await Promise.all([
    readFile(new URL('main.wasm', root)),
    archiveOverride ?? readFile(new URL('sources.tar', root)),
  ]);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const warnings = new Set();
  let ex;
  const result = await WebAssembly.instantiate(wasm, {
    js: {
      log(level, pointer, length) {
        if (level <= 1)
          warnings.add(
            decoder.decode(new Uint8Array(ex.memory.buffer, pointer, length)),
          );
      },
    },
  });
  ex = result.instance.exports;
  const pointer = ex.alloc(archive.length);
  new Uint8Array(ex.memory.buffer, pointer, archive.length).set(archive);
  ex.unpack(pointer, archive.length);
  function string(value) {
    return decoder.decode(
      new Uint8Array(
        ex.memory.buffer,
        Number(value & 0xffffffffn),
        Number(value >> 32n),
      ),
    );
  }
  function numbers(value, width = 32) {
    const pointer = Number(value & 0xffffffffn);
    const length = Number(value >> 32n);
    return Array.from(
      width === 64
        ? new BigUint64Array(ex.memory.buffer, pointer, length)
        : new Uint32Array(ex.memory.buffer, pointer, length),
    );
  }
  function input(text) {
    const bytes = encoder.encode(text);
    const pointer = ex.set_input_string(bytes.length);
    new Uint8Array(ex.memory.buffer, pointer, bytes.length).set(bytes);
  }
  function findDeclaration(name) {
    input(name);
    const id = ex.find_decl();
    return id < 0 ? null : id;
  }
  function members(id, category) {
    const result = numbers(ex.namespace_members(id, true));
    if (category === 10) result.push(...numbers(ex.type_fn_members(id, true)));
    return [...new Set(result)];
  }
  const files = readTar(archive);
  const roots = new Map();
  const queue = [];
  for (const path of files.keys()) {
    if (!path.endsWith('.zig')) continue;
    input(path);
    const id = ex.find_file_root();
    if (id < 0) throw new Error(`Missing source root: ${path}`);
    roots.set(path, id);
    queue.push(id);
  }
  const declarations = new Map();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const id = queue[cursor];
    if (declarations.has(id)) continue;
    if (declarations.size > 150_000)
      throw new Error('Declaration traversal exceeded safety bound');
    const category = ex.categorize_decl(id, 0);
    const aliasee = category === 7 ? ex.get_aliasee() : null;
    const entry = {
      id,
      name: string(ex.decl_name(id)),
      fqn: string(ex.decl_fqn(id)),
      sourcePath: string(ex.decl_file_path(id)),
      sourceLine: Number(
        string(ex.decl_line_numbers_html(id)).match(/>(\d+)</)?.[1] ?? 1,
      ),
      category,
      aliasee,
    };
    declarations.set(id, entry);
    if (aliasee !== null) queue.push(aliasee);
    queue.push(...members(id, category));
  }
  return {
    ex,
    string,
    numbers,
    roots,
    files,
    declarations,
    warnings,
    findDeclaration,
    members,
  };
}
