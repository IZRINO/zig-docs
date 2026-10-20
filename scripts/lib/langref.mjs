import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_URL = 'https://ziglang.org/documentation/0.17.0/';
const BLOCKS = new Set([
  'p',
  'li',
  'dt',
  'dd',
  'th',
  'td',
  'caption',
  'h2',
  'h3',
  'h4',
  'figcaption',
  'aside',
]);
const INLINE = new Set([
  'a',
  'em',
  'strong',
  'b',
  'i',
  'span',
  'sub',
  'sup',
  'q',
  's',
  'u',
  'br',
]);
const PROTECTED = new Set(['code', 'cite', 'kbd', 'samp']);
const normalized = (s) => s.replace(/\s+/g, ' ').trim();
const hash = (s) => createHash('sha256').update(s).digest('hex');

export function splitLangref(source) {
  const $ = load(source);
  const pages = [];
  let current;
  for (const node of $('main').contents().toArray()) {
    if (node.type === 'tag' && node.tagName === 'h2') {
      const slug = $(node).attr('id');
      current = {
        id: `reference/${slug}`,
        kind: 'langref',
        title: $(node).clone().find('.hdr').remove().end().text().trim(),
        sourceUrl: `${SOURCE_URL}#${slug}`,
        file: `reference/${slug}.json`,
        headings: [],
        html: '',
      };
      pages.push(current);
    }
    if (current) current.html += $.html(node);
  }
  for (const page of pages) {
    const $p = load(page.html, null, false);
    $p('.hdr').remove();
    page.headings = $p('h2,h3,h4')
      .map((_, el) => ({
        depth: Number(el.tagName[1]),
        slug: $p(el).attr('id'),
        text: $p(el).text().trim(),
      }))
      .get();
    page.html = $p.html();
  }
  return pages;
}

export function rewriteReferenceLinks(
  html,
  locale,
  owners,
  base = '/zig-docs',
) {
  const $ = load(html, null, false);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href.startsWith('#')) return;
    const anchor = decodeURIComponent(href.slice(1).replace(/^toc-/, ''));
    if (owners.has(anchor))
      $(el).attr(
        'href',
        `${base}/${locale}/reference/${owners.get(anchor)}/#${anchor}`,
      );
  });
  return $.html();
}

function templateFor(html) {
  const $ = load(html, null, false);
  const slots = [];
  const encode = (node) => {
    if (node.type === 'text') return node.data;
    if (node.type === 'comment') return '';
    const i = slots.length;
    slots.push({
      node,
      protected: PROTECTED.has(node.tagName) || !INLINE.has(node.tagName),
    });
    if (slots[i].protected || node.tagName === 'br') return `<${i}/>`;
    return `<${i}>${node.children.map(encode).join('')}</${i}>`;
  };
  return {
    source: normalized($.root().contents().toArray().map(encode).join('')),
    slots,
    $,
  };
}

export function translateFragment(original, translation) {
  const { slots, $ } = templateFor(original);
  const seen = new Map();
  const target = translation.replace(
    /<(\d+)(\/?)>|<\/(\d+)>/g,
    (_match, start, self, end) => {
      const i = Number(end ?? start);
      const slot = slots[i];
      if (!slot) throw new Error(`Unknown translation placeholder ${i}`);
      const key = `${i}:${end !== undefined ? 'end' : self ? 'self' : 'start'}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if (self) return $.html(slot.node);
      if (end !== undefined) return `</${slot.node.tagName}>`;
      const copy = $(slot.node).clone().empty();
      return $.html(copy).replace(new RegExp(`</${slot.node.tagName}>$`), '');
    },
  );
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const expected =
      slot.protected || slot.node.tagName === 'br'
        ? [`${i}:self`]
        : [`${i}:start`, `${i}:end`];
    for (const key of expected)
      if (seen.get(key) !== 1)
        throw new Error(`Missing or repeated translation placeholder ${key}`);
  }
  return target;
}

/** Conservative lexical token comparison for tests; production also checks HTML code spans. */
export function codeTokens(source) {
  return (
    source
      .match(
        /\\\\[^\n]*(?:\n|$)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|[^\s]/g,
      )
      ?.filter((s) => !s.startsWith('//')) ?? []
  );
}

function collectUnits(page) {
  const $ = load(page.html, null, false);
  const units = [];
  let index = 0;
  const selector = [...BLOCKS].join(',');
  for (const el of $(selector).toArray().reverse()) {
    if (!$(el).find(selector).length) continue;
    let run = [];
    let output = '';
    const flush = () => {
      const content = run.map((n) => $.html(n)).join('');
      if (
        run.some((n) =>
          /[A-Za-z]/.test(n.type === 'text' ? n.data : $(n).text()),
        )
      ) {
        output += `<span data-langref-run="">${content}</span>`;
      } else output += content;
      run = [];
    };
    for (const child of [...el.children]) {
      if (
        child.type === 'tag' &&
        (BLOCKS.has(child.tagName) ||
          $(child).find(selector).length ||
          ['ul', 'ol', 'pre', 'table', 'div'].includes(child.tagName))
      ) {
        flush();
        output += $.html(child);
      } else run.push(child);
    }
    flush();
    $(el).html(output);
  }
  for (const el of $('*').toArray()) {
    if (
      (!BLOCKS.has(el.tagName) && !$(el).is('[data-langref-run]')) ||
      $(el).parents('pre,code').length
    )
      continue;
    if ($(el).find(selector).length) continue;
    const html = $(el).html();
    const { source } = templateFor(html);
    if (!/[A-Za-z]/.test(source.replace(/<\/?\d+\/?>/g, ''))) continue;
    const key = `${page.id}::text:${index++}`;
    units.push({
      key,
      source,
      html,
      hash: hash(source),
      element: el,
      kind: 'text',
    });
  }
  for (const el of $('pre .tok-comment').toArray()) {
    const source = $(el).text();
    if (!/[A-Za-z]/.test(source)) continue;
    units.push({
      key: `${page.id}::comment:${index++}`,
      source,
      html: $(el).html(),
      hash: hash(source),
      element: el,
      kind: 'comment',
    });
  }
  return { $, units };
}

export async function extractLangref(options = {}) {
  const root = options.root ?? process.cwd();
  const write = options.write !== false;
  const source = await readFile(
    path.join(root, 'upstream/0.17.0/langref.html'),
    'utf8',
  );
  const pages = splitLangref(source);
  const owners = new Map();
  for (const page of pages) {
    const $ = load(page.html, null, false);
    $('[id]').each((_, el) =>
      owners.set($(el).attr('id'), page.id.slice('reference/'.length)),
    );
  }
  const entries = {};
  const translationsDir = path.join(root, 'translations');
  if (write) await mkdir(translationsDir, { recursive: true });
  const baseline = JSON.parse(
    await readFile(
      path.join(translationsDir, 'langref.source-hashes.json'),
      'utf8',
    ),
  );
  if (baseline.snapshotSha256 !== hash(source))
    throw new Error(
      'Language reference snapshot changed; translations require source review.',
    );
  for (const file of (await readdir(translationsDir))
    .filter((s) => /^langref\.zh-cn\..+\.json$/.test(s))
    .sort())
    Object.assign(
      entries,
      JSON.parse(await readFile(path.join(translationsDir, file), 'utf8')),
    );
  const inventory = [];
  const zh = [];
  const missing = [];
  let translated = 0;
  for (const page of pages) {
    const { $, units } = collectUnits(page);
    for (const unit of units) {
      if (baseline.units[unit.key] !== unit.hash)
        throw new Error(
          `Language reference translation source changed: ${unit.key}`,
        );
      inventory.push({
        key: unit.key,
        kind: unit.kind,
        source: unit.source,
        sourceHash: unit.hash,
        page: page.id,
      });
      const entry = entries[unit.key] ?? entries[unit.source];
      if (typeof entry !== 'string' || !entry.trim()) {
        missing.push(unit.key);
        continue;
      }
      if (unit.kind === 'comment') {
        if (
          entry.split('\n').length !== unit.source.split('\n').length ||
          !entry.startsWith(unit.source.match(/^\/\/[!/]?/)[0])
        )
          throw new Error(`Comment line or delimiter mismatch: ${unit.key}`);
        $(unit.element).text(entry);
      } else $(unit.element).html(translateFragment(unit.html, entry));
      translated++;
    }
    const localized = {
      ...page,
      title: $('h2').first().text().trim(),
      html: rewriteReferenceLinks($.html(), 'zh-cn', owners),
    };
    localized.headings = $('h2,h3,h4')
      .map((_, el) => ({
        depth: Number(el.tagName[1]),
        slug: $(el).attr('id'),
        text: $(el).text().trim(),
      }))
      .get();
    localized.translation = {
      total: units.length,
      translated: units.filter(
        (u) => typeof (entries[u.key] ?? entries[u.source]) === 'string',
      ).length,
    };
    const original = load(page.html, null, false);
    const before = original('pre').toArray();
    const after = $('pre').toArray();
    if (before.length !== after.length)
      throw new Error(`Code block count changed: ${page.id}`);
    for (let i = 0; i < before.length; i++) {
      const left = original(before[i]).text();
      const right = $(after[i]).text();
      if (
        JSON.stringify(codeTokens(left)) !== JSON.stringify(codeTokens(right))
      )
        throw new Error(`Non-comment code changed: ${page.id} block ${i}`);
      if (left.split('\n').length !== right.split('\n').length)
        throw new Error(`Source line count changed: ${page.id} block ${i}`);
    }
    zh.push(localized);
    page.html = rewriteReferenceLinks(page.html, 'en', owners);
  }
  if (write)
    await writeFile(
      path.join(translationsDir, 'langref.inventory.json'),
      JSON.stringify(inventory, null, 2) + '\n',
    );
  if (write)
    await writeFile(
      path.join(translationsDir, 'langref.status.json'),
      JSON.stringify(
        { total: inventory.length, translated, missing },
        null,
        2,
      ) + '\n',
    );
  if (missing.length && !options.allowIncomplete)
    throw new Error(
      `Language reference translations incomplete: ${missing.length}/${inventory.length}. See translations/langref.status.json`,
    );
  if (write)
    for (const [locale, localizedPages] of [
      ['en', pages],
      ['zh-cn', zh],
    ]) {
      await mkdir(path.join(root, 'content', locale, 'reference'), {
        recursive: true,
      });
      for (const page of localizedPages)
        await writeFile(
          path.join(root, 'content', locale, page.file),
          JSON.stringify(page, null, 2) + '\n',
        );
    }
  const metadata = ({ html, ...rest }) => rest;
  return {
    en: pages.map(metadata),
    zh: zh.map(metadata),
    stats: {
      pages: pages.length,
      units: inventory.length,
      translated,
      missing: missing.length,
    },
  };
}
