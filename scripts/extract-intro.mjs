import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { enhanceIntroCodeBlocks } from './lib/code-frame.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = [
  ['getting-started', '快速入门'],
  ['overview', '深入了解'],
  ['build-system', 'Zig 构建系统'],
  ['samples', '代码示例'],
  ['why_zig_rust_d_cpp', '有了 C++、D 和 Rust，为什么还需要 Zig？'],
].map(([slug, title]) => ({
  slug,
  id: `intro/${slug}`,
  title,
  sourceUrl: `https://ziglang.org/zh-CN/intro/${slug}/`,
  sourceFile: `upstream/intro/zh-CN/${slug}.html`,
  file: `intro/${slug}.json`,
}));
const pageBySourcePath = new Map(
  pages.map((page) => [`/zh-CN/intro/${page.slug}/`, page.slug]),
);

function localizeLinks($, slug) {
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    let url;
    try {
      url = new URL(href, `https://ziglang.org/zh-CN/intro/${slug}/`);
    } catch {
      return;
    }
    const target = pageBySourcePath.get(url.pathname);
    if (!target) return;
    const path = target === slug ? '' : `../${target}/`;
    $(element).attr('href', `${path}${url.hash}` || './');
  });
}

async function main() {
  const sourceAssets = [];
  const outputRoot = resolve(root, 'content/0.17.1/zh-cn/intro');
  await mkdir(outputRoot, { recursive: true });
  const heartPath = 'upstream/intro/zh-CN/heart.svg';
  const heart = await readFile(resolve(root, heartPath));
  sourceAssets.push({
    file: heartPath,
    sha256: createHash('sha256').update(heart).digest('hex'),
  });
  const heartOutput = resolve(root, 'public/assets/zig-heart.svg');
  await mkdir(dirname(heartOutput), { recursive: true });
  await writeFile(heartOutput, heart);
  for (const page of pages) {
    const bytes = await readFile(resolve(root, page.sourceFile));
    sourceAssets.push({
      file: page.sourceFile.replaceAll('\\', '/'),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    const $ = load(bytes.toString('utf8'), null, false);
    const content = $('#content .container').last();
    if (!content.length)
      throw new Error(`Missing article content: ${page.slug}`);
    content
      .find('img[src="https://ziglang.org/heart.svg"]')
      .attr('src', '../../../../assets/zig-heart.svg');
    content.find('#back, h1.title').remove();
    const toc = content.children('ul').first();
    const firstSection = content.children('h1').first();
    if (toc.length && firstSection.length && toc.index() < firstSection.index())
      toc.remove();

    const ids = new Set(
      content
        .find('[id]')
        .map((_, element) => $(element).attr('id'))
        .get(),
    );
    const headings = [];
    content.find('h1,h2,h3,h4,h5').each((index, element) => {
      const heading = $(element);
      const depth = Number(element.tagName.slice(1)) + 1;
      let slug = heading.attr('id');
      if (!slug) {
        slug = `intro-section-${index + 1}`;
        while (ids.has(slug)) slug += '-section';
        heading.attr('id', slug);
        ids.add(slug);
      }
      const replacement = $(`<h${depth}></h${depth}>`);
      for (const [name, value] of Object.entries(element.attribs))
        replacement.attr(name, value);
      replacement.append(heading.contents());
      heading.replaceWith(replacement);
      headings.push({ depth, slug, text: replacement.text().trim() });
    });

    localizeLinks($, page.slug);
    const html = await enhanceIntroCodeBlocks(content.html() ?? '', {
      locale: 'zh-cn',
    });
    const meta = {
      id: page.id,
      kind: 'intro',
      title: page.title,
      sourceUrl: page.sourceUrl,
      file: page.file,
      headings,
    };
    await writeFile(
      resolve(root, 'content/0.17.1/zh-cn', page.file),
      `${JSON.stringify({ ...meta, html })}\n`,
    );
    page.meta = meta;
  }

  await writeFile(
    resolve(root, 'upstream/intro/manifest.json'),
    `${JSON.stringify({ source: 'https://ziglang.org/zh-CN/intro/', assets: sourceAssets }, null, 2)}\n`,
  );
  await writeFile(
    resolve(outputRoot, 'manifest.json'),
    `${JSON.stringify(
      pages.map((page) => page.meta),
      null,
      2,
    )}\n`,
  );
  console.log(`Generated ${pages.length} official Chinese intro pages.`);
}

await main();
