import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { load } from 'cheerio';

const root = resolve('dist');
const pages = new Map();
const links = [];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.name.endsWith('.html')) {
      const $ = load(await readFile(path, 'utf8'));
      const pathname = `/${relative(root, path).replaceAll('\\', '/')}`.replace(
        /index\.html$/,
        '',
      );
      pages.set(
        pathname,
        new Set(
          $('[id]')
            .map((_, element) => $(element).attr('id'))
            .get(),
        ),
      );
      $('a[href],link[href],script[src],img[src]').each((_, element) => {
        const target = $(element).attr('href') ?? $(element).attr('src');
        if (target) links.push({ source: pathname, target });
      });
    }
  }
}
await scan(root);
const issues = [];
const checked = new Set();
for (const { source, target } of links) {
  let url;
  try {
    url = new URL(target, `https://izrino.github.io/zig-docs${source}`);
  } catch {
    issues.push(`${source}: invalid URL ${target}`);
    continue;
  }
  if (url.origin !== 'https://izrino.github.io') continue;
  if (!url.pathname.startsWith('/zig-docs/')) {
    issues.push(`${source}: link escapes project base ${target}`);
    continue;
  }
  const pathname = decodeURIComponent(url.pathname.slice('/zig-docs'.length));
  const key = `${pathname}${url.hash}`;
  if (checked.has(key)) continue;
  checked.add(key);
  if (pages.has(pathname)) {
    const anchor = decodeURIComponent(url.hash.slice(1));
    if (anchor && !pages.get(pathname).has(anchor))
      issues.push(`${source}: missing anchor ${target}`);
  } else {
    try {
      if (!(await stat(resolve(root, `.${pathname}`))).isFile())
        issues.push(`${source}: missing file ${target}`);
    } catch {
      issues.push(`${source}: missing file ${target}`);
    }
  }
}
if (issues.length) {
  console.error(issues.slice(0, 100).join('\n'));
  throw new Error(`${issues.length} broken internal links`);
}
console.log(
  `Verified ${pages.size} pages and ${checked.size} unique internal link targets.`,
);
