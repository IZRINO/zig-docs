import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { enhanceIntroCodeBlocks, renderCodeFrame } from './lib/code-frame.mjs';
import { readGrammar } from './lib/grammar.mjs';

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
  file: `intro/${slug}.json`,
}));
const pageBySourcePath = new Map(
  pages.flatMap((page) => [
    [`/zh-CN/intro/${page.slug}/`, page.slug],
    [`/intro/${page.slug}/`, page.slug],
  ]),
);

function localizeLinks($, slug, sourceUrl) {
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    let url;
    try {
      url = new URL(href, sourceUrl);
    } catch {
      return;
    }
    if (url.origin !== 'https://ziglang.org') return;
    const target = pageBySourcePath.get(url.pathname);
    if (!target) {
      if (!href.startsWith('#')) $(element).attr('href', url.href);
      return;
    }
    const path = target === slug ? '' : `../${target}/`;
    $(element).attr('href', `${path}${url.hash}` || './');
  });
}

async function main() {
  const sourceAssets = [];
  const heartPath = 'upstream/intro/zh-CN/heart.svg';
  const heart = await readFile(resolve(root, heartPath));
  sourceAssets.push({
    file: heartPath,
    sha256: createHash('sha256').update(heart).digest('hex'),
  });
  const heartOutput = resolve(root, 'public/assets/zig-heart.svg');
  await mkdir(dirname(heartOutput), { recursive: true });
  await writeFile(heartOutput, heart);
  const grammar = await readGrammar();
  await writeFile(
    resolve(root, 'public/licenses/zig-spec-LICENSE.txt'),
    await readFile(resolve(root, 'upstream/intro/grammar/LICENSE')),
  );
  for (const locale of ['en', 'zh-cn']) {
    const outputRoot = resolve(root, `content/${locale}/intro`);
    await mkdir(outputRoot, { recursive: true });
    const entries = [];
    for (const page of pages) {
      const sourceLocale = locale === 'en' ? 'en' : 'zh-CN';
      const sourceUrl = `https://ziglang.org/${locale === 'en' ? '' : 'zh-CN/'}intro/${page.slug}/`;
      const sourceFile = `upstream/intro/${sourceLocale}/${page.slug}.html`;
      const bytes = await readFile(resolve(root, sourceFile));
      sourceAssets.push({
        file: sourceFile,
        sourceUrl,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
      const $ = load(bytes.toString('utf8'), null, false);
      const content = $('#content .container').last();
      if (!content.length)
        throw new Error(`Missing article content: ${page.slug}`);
      content
        .find('img[src="https://ziglang.org/heart.svg"], img[src="/heart.svg"]')
        .attr('src', '/zig-docs/assets/zig-heart.svg');
      const title =
        locale === 'en' ? content.find('h1.title').text().trim() : page.title;
      content.find('#back, h1.title').remove();
      const toc = content.children('ul').first();
      const firstSection = content.children('h1').first();
      if (
        toc.length &&
        firstSection.length &&
        toc.index() < firstSection.index()
      )
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

      localizeLinks($, page.slug, sourceUrl);
      const html = await enhanceIntroCodeBlocks(content.html() ?? '', {
        locale,
      });
      const meta = {
        id: page.id,
        kind: 'intro',
        title,
        sourceUrl,
        file: page.file,
        headings,
      };
      await writeFile(
        resolve(root, `content/${locale}`, page.file),
        `${JSON.stringify({ ...meta, html })}\n`,
      );
      entries.push(meta);
    }

    const source = locale === 'en' ? grammar.source : grammar.translated;
    const originalSections = grammar.source.split(/(?=^# \*\*\* .+ \*\*\*$)/m);
    const sections = source.split(/(?=^# \*\*\* .+ \*\*\*$)/m);
    const headings = [];
    const body = [];
    for (let index = 0; index < sections.length; index++) {
      const originalTitle =
        originalSections[index].match(/^# \*\*\* (.+) \*\*\*$/m)?.[1] ??
        'LL(k)';
      const text =
        sections[index].match(/^# \*\*\* (.+) \*\*\*$/m)?.[1] ?? 'LL(k)';
      const slug = `grammar-${originalTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-$/, '')}`;
      headings.push({ depth: 2, slug, text });
      body.push(`<h2 id="${slug}">${text}</h2>`);
      body.push(
        await renderCodeFrame(sections[index], {
          locale,
          language: 'text',
          title: 'grammar.peg',
        }),
      );
    }
    const meta = {
      id: 'intro/grammar',
      kind: 'intro',
      title: locale === 'en' ? 'Grammar Rules' : grammar.translation.title,
      sourceUrl: grammar.snapshot.sourceUrl,
      file: 'intro/grammar.json',
      headings,
    };
    const note =
      locale === 'en'
        ? 'Shared introduction material, independent of the selected documentation version.'
        : '各版本共用的入门资料，不随所选文档版本变化。';
    const html = `<p>${note}</p><p><a href="https://codeberg.org/ziglang/zig-spec/src/commit/${grammar.snapshot.commit}/grammar/grammar.peg">ziglang/zig-spec · master · ${grammar.snapshot.commit.slice(0, 12)}</a> · <a href="/zig-docs/licenses/zig-spec-LICENSE.txt">MIT License</a></p>${body.join('\n')}`;
    await writeFile(
      resolve(root, `content/${locale}`, meta.file),
      `${JSON.stringify({ ...meta, html })}\n`,
    );
    entries.push(meta);
    await writeFile(
      resolve(outputRoot, 'manifest.json'),
      `${JSON.stringify(entries, null, 2)}\n`,
    );
  }
  await writeFile(
    resolve(root, 'upstream/intro/manifest.json'),
    `${JSON.stringify({ sources: { en: 'https://ziglang.org/intro/', 'zh-cn': 'https://ziglang.org/zh-CN/intro/' }, assets: sourceAssets }, null, 2)}\n`,
  );
  console.log(`Generated ${pages.length + 1} shared intro pages per locale.`);
}

await main();
