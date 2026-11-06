import { createHash } from 'node:crypto';
import { load } from 'cheerio';

// Splits the official English intro pages into prose segments. Inline markup
// becomes numbered placeholders: `<n>…</n>` keeps an element whose text is
// translated, `<n/>` keeps an element verbatim (code, kbd, links without
// prose). Code blocks are never segmented.
const BLOCK = new Set([
  'p',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'td',
  'th',
  'figcaption',
  'dt',
  'dd',
  'caption',
  'title',
]);
const CONTAINER = new Set([
  'ul',
  'ol',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'figure',
  'div',
  'dl',
  'blockquote',
]);
const SKIP = new Set(['pre', 'script', 'style']);
const ATOMIC = new Set(['code', 'kbd', 'samp', 'img', 'br', 'cite']);
const INLINE = new Set([
  'a',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'span',
  'sup',
  'sub',
]);
const PLACEHOLDER = /<(\/?)(\d+)(\/?)>/g;
const LETTERS = /\p{L}/u;
const ASCII_WS = /[ \t\n\r\f]+/g;

export const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex');

const outside = (template) => template.replace(PLACEHOLDER, ' ');
const escapeText = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (text) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function collectRuns(node, runs) {
  let run = [];
  const flush = () => {
    if (run.length) runs.push(run);
    run = [];
  };
  for (const child of node.children ?? []) {
    if (child.name) {
      if (SKIP.has(child.name)) {
        flush();
        continue;
      }
      if (BLOCK.has(child.name) || CONTAINER.has(child.name)) {
        flush();
        collectRuns(child, runs);
        continue;
      }
      if (!ATOMIC.has(child.name) && !INLINE.has(child.name))
        throw new Error(`Unsupported intro element <${child.name}>`);
    }
    run.push(child);
  }
  flush();
}

// Builds a run's template. Placeholder ids follow document order; an inline
// element without prose of its own collapses to a verbatim `<n/>`.
function buildTemplate(run) {
  const slots = [];
  const walk = (nodes) => {
    let out = '';
    for (const node of nodes) {
      if (node.type === 'text') {
        if (/<\/?\d+\/?>/.test(node.data))
          throw new Error(`Placeholder-like intro text: ${node.data.trim()}`);
        out += node.data;
      } else if (node.name) {
        const id = slots.push(null) - 1;
        const inner = ATOMIC.has(node.name) ? '' : walk(node.children ?? []);
        if (ATOMIC.has(node.name) || !LETTERS.test(outside(inner))) {
          slots.length = id;
          slots.push({ node, atomic: true });
          out += `<${id}/>`;
        } else {
          slots[id] = { node, atomic: false };
          out += `<${id}>${inner}</${id}>`;
        }
      }
    }
    return out;
  };
  const raw = walk(run);
  return {
    template: raw.replace(ASCII_WS, ' ').trim(),
    lead: raw.match(/^[ \t\n\r\f]*/)[0],
    trail: raw.match(/[ \t\n\r\f]*$/)[0],
    slots,
  };
}

function structure(template, label) {
  const map = new Map();
  const stack = [];
  for (const [, close, id, self] of template.matchAll(PLACEHOLDER)) {
    if (close && self) throw new Error(`Malformed placeholder in ${label}`);
    if (close) {
      if (stack.pop() !== id)
        throw new Error(`Unbalanced placeholder </${id}> in ${label}`);
      continue;
    }
    if (map.has(id)) throw new Error(`Duplicate placeholder ${id} in ${label}`);
    map.set(id, `${self ? 'atomic' : 'inline'}:${stack.at(-1) ?? ''}`);
    if (!self) stack.push(id);
  }
  if (stack.length) throw new Error(`Unclosed placeholder in ${label}`);
  return map;
}

const numbers = (template) => outside(template).match(/\d+(?:\.\d+)?/g) ?? [];

// Checks one translation against its English template: identical placeholder
// set, nesting and verbatim markers, and every English number still present.
export function checkSegment(source, translation) {
  const label = JSON.stringify(source.slice(0, 80));
  if (typeof translation !== 'string' || !translation.trim())
    throw new Error(`Empty intro translation for ${label}`);
  const expected = structure(source, label);
  const actual = structure(translation, label);
  if (
    expected.size !== actual.size ||
    [...expected].some(([id, kind]) => actual.get(id) !== kind)
  )
    throw new Error(`Placeholder structure differs for ${label}`);
  const remaining = numbers(translation);
  for (const value of numbers(source)) {
    const index = remaining.indexOf(value);
    if (index < 0)
      throw new Error(`Number ${value} missing in translation of ${label}`);
    remaining.splice(index, 1);
  }
}

function render($, template, slots) {
  let html = '';
  let last = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    html += escapeText(template.slice(last, match.index));
    last = match.index + match[0].length;
    const [, close, id, self] = match;
    const { node } = slots[Number(id)];
    if (self) html += $.html(node);
    else if (close) html += `</${node.name}>`;
    else
      html += `<${node.name}${Object.entries(node.attribs)
        .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
        .join('')}>`;
  }
  return html + escapeText(template.slice(last));
}

function pageRuns($) {
  const runs = [];
  collectRuns($('title').get(0), runs);
  const content = $('#content .container').last();
  if (!content.length) throw new Error('Missing intro article content');
  collectRuns(content.get(0), runs);
  return runs
    .map((nodes) => ({ nodes, ...buildTemplate(nodes) }))
    .filter((run) => LETTERS.test(outside(run.template)));
}

// Unique English segments of a page, in document order.
export function introSegments(sourceHtml) {
  return [...new Set(pageRuns(load(sourceHtml)).map((run) => run.template))];
}

function fingerprint(html) {
  const $ = load(html);
  const content = $('#content .container').last();
  const all = (selector, map) => content.find(selector).map(map).get().sort();
  return {
    code: content
      .find('pre')
      .map((_, element) => $(element).text())
      .get(),
    ids: all('[id]', (_, element) => $(element).attr('id')),
    links: all('[href]', (_, element) => $(element).attr('href')),
    verbatim: all('code,kbd,samp,cite,img,br', (_, element) => $.html(element)),
    tags: all('*', (_, element) => element.tagName),
  };
}

// Renders the Chinese page from the English snapshot and its segment table.
export function translateIntroPage(sourceHtml, translation, label = 'intro') {
  if (translation.sourceHash !== sha256(sourceHtml))
    throw new Error(
      `English intro source changed for ${label}; update the translation`,
    );
  const $ = load(sourceHtml);
  const used = new Set();
  const missing = [];
  const runs = pageRuns($);
  for (const run of runs) {
    const zh = translation.segments[run.template];
    if (zh === undefined) {
      missing.push(run.template);
      continue;
    }
    checkSegment(run.template, zh);
    used.add(run.template);
    run.html = run.lead + render($, zh, run.slots) + run.trail;
  }
  if (missing.length)
    throw new Error(
      `Missing ${missing.length} intro translations for ${label}:\n${missing.slice(0, 5).join('\n')}`,
    );
  const stale = Object.keys(translation.segments).filter(
    (key) => !used.has(key),
  );
  if (stale.length)
    throw new Error(
      `Stale intro translations for ${label}:\n${stale.slice(0, 5).join('\n')}`,
    );
  for (const run of runs) {
    // `.before()` ignores text nodes; `replaceWith` works on any child node.
    $(run.nodes[0]).replaceWith(run.html);
    for (const node of run.nodes.slice(1)) $(node).remove();
  }
  $('html').attr('lang', 'zh-CN');
  const output = $.html();
  const before = fingerprint(sourceHtml);
  const after = fingerprint(output);
  for (const key of Object.keys(before))
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      throw new Error(
        `Translated intro changed ${key} for ${label}: ${JSON.stringify(before[key]).slice(0, 300)} => ${JSON.stringify(after[key]).slice(0, 300)}`,
      );
  return output;
}
