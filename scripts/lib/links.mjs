import { readFile, writeFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { symbolHref } from './std-runtime.mjs';

export function rewriteDocumentationLinks(
  html,
  sourceUrl,
  locale,
  referenceOwners,
  symbolPages,
  unresolved,
  version = '0.17.0',
) {
  const officialRoot = `https://ziglang.org/documentation/${version}/`;
  const prefix = `/zig-docs/${locale}/${version === '0.17.0' ? '' : `${version}/`}`;
  const $ = load(html, null, false);
  $('a[href]').each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr('href');
    if (href.startsWith('#')) return;
    let url;
    try {
      url = new URL(href, sourceUrl);
    } catch {
      return;
    }
    if (!url.href.startsWith(officialRoot)) return;
    const hash = decodeURIComponent(url.hash.slice(1));
    let target;
    if (url.pathname === `/documentation/${version}/std/`) {
      target = hash
        ? symbolHref(hash, symbolPages, locale, version)
        : `${prefix}std/`;
    } else if (url.pathname === `/documentation/${version}/`) {
      const owner = referenceOwners.get(hash.replace(/^toc-/, ''));
      if (owner)
        target = `${prefix}${owner}/#${encodeURIComponent(hash.replace(/^toc-/, ''))}`;
      else if (!hash) target = `${prefix}#language-reference`;
    }
    if (target) anchor.attr('href', target);
    else unresolved.add(url.href);
  });
  return $.html();
}

export async function rewriteContentLinks(
  reference,
  libraries,
  version = '0.17.0',
) {
  const officialRoot = `https://ziglang.org/documentation/${version}/`;
  const owners = new Map(
    reference.flatMap((page) =>
      page.headings.map((heading) => [heading.slug, page.id]),
    ),
  );
  const unresolved = new Set();
  for (const [locale, documents, symbolPages] of libraries) {
    for (const meta of documents) {
      const file = new URL(
        `../../content/${version === '0.17.0' ? '' : `${version}/`}${locale}/${meta.file}`,
        import.meta.url,
      );
      const raw = await readFile(file, 'utf8');
      if (meta.kind === 'std' && !raw.includes(officialRoot)) continue;
      const page = JSON.parse(raw);
      page.html = rewriteDocumentationLinks(
        page.html,
        page.sourceUrl,
        locale,
        owners,
        symbolPages,
        unresolved,
        version,
      );
      const next = `${JSON.stringify(page)}\n`;
      if (next !== raw) await writeFile(file, next);
    }
  }
  return [...unresolved].sort();
}
