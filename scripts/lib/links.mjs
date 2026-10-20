import { readFile, writeFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { symbolHref } from './std-runtime.mjs';

const officialRoot = 'https://ziglang.org/documentation/0.17.0/';

export function rewriteDocumentationLinks(
  html,
  sourceUrl,
  locale,
  referenceOwners,
  symbolPages,
  unresolved,
) {
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
    if (url.pathname === '/documentation/0.17.0/std/') {
      target = hash
        ? symbolHref(hash, symbolPages, locale)
        : `/zig-docs/${locale}/std/`;
    } else if (url.pathname === '/documentation/0.17.0/') {
      const owner = referenceOwners.get(hash.replace(/^toc-/, ''));
      if (owner)
        target = `/zig-docs/${locale}/${owner}/#${encodeURIComponent(hash.replace(/^toc-/, ''))}`;
      else if (!hash) target = `/zig-docs/${locale}/#language-reference`;
    }
    if (target) anchor.attr('href', target);
    else unresolved.add(url.href);
  });
  return $.html();
}

export async function rewriteContentLinks(reference, libraries) {
  const owners = new Map(
    reference.flatMap((page) =>
      page.headings.map((heading) => [heading.slug, page.id]),
    ),
  );
  const unresolved = new Set();
  for (const [locale, documents, symbolPages] of libraries) {
    for (const meta of documents) {
      const file = new URL(
        `../../content/${locale}/${meta.file}`,
        import.meta.url,
      );
      const page = JSON.parse(await readFile(file, 'utf8'));
      page.html = rewriteDocumentationLinks(
        page.html,
        page.sourceUrl,
        locale,
        owners,
        symbolPages,
        unresolved,
      );
      await writeFile(file, `${JSON.stringify(page)}\n`);
    }
  }
  return [...unresolved].sort();
}
