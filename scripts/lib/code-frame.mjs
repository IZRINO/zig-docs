import { load } from 'cheerio';
import {
  createRenderer,
  ExpressiveCodeBlock,
} from '@astrojs/starlight/expressive-code';
import { toHtml } from '@astrojs/starlight/expressive-code/hast';

let rendererPromise;

export function getCodeFrameRenderer() {
  rendererPromise ??= createRenderer({
    themes: ['github-light', 'github-dark'],
    themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
    useDarkModeMediaQuery: false,
    tabWidth: 0,
  });
  return rendererPromise;
}

export async function renderCodeFrame(
  code,
  { locale = 'en', language = 'zig', title = '', terminal = false } = {},
) {
  const renderer = await getCodeFrameRenderer();
  const meta = [
    title ? `title=${JSON.stringify(title)}` : '',
    terminal ? 'terminal' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const block = new ExpressiveCodeBlock({
    code: '',
    language,
    meta,
    locale,
  });
  // The constructor trims whitespace. Insert the snapshot lines without that normalization.
  const lines = code.split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length) block.insertLines(0, lines);
  const result = await renderer.ec.render(block);
  const $ = load(toHtml(result.renderedGroupAst), null, false);
  $('.copy').remove();
  const pre = $('pre')
    .first()
    .attr({ 'data-code-frame': 'true', tabindex: '0' });
  pre.find('.ec-line').each((index, line) => {
    const content = $(line).find('.code');
    // Expressive Code uses a newline as an empty-line placeholder. Keep it out of the text.
    if (lines[index] === '') content.empty();
    if (index < lines.length - 1 || code.endsWith('\n')) $(line).after('\n');
  });
  if (pre.text() !== code)
    throw new Error(`Code frame changed source text: ${title}`);
  const frame = $('.frame').first();
  if (lines.length > 96)
    frame.addClass('is-long').attr('data-code-lines', String(lines.length));
  return $('.expressive-code').first().prop('outerHTML');
}

export async function enhanceCodeBlocks(html, { locale = 'en' } = {}) {
  const $ = load(html, null, false);
  $('h2').first().addClass('chapter-anchor').attr('aria-hidden', 'true');
  const jobs = [];
  $('figure').each((_, figure) => {
    const node = $(figure);
    const pre = node.find('pre').first();
    if (!pre.length) return;
    if (node.find('a').length)
      throw new Error('Code frame contains links that require preservation.');
    const terminal = node.find('.shell-cap').length > 0;
    const title = terminal
      ? locale === 'en'
        ? 'Terminal'
        : '命令行'
      : (
          node.find('cite.file').first().text() ||
          node.find('figcaption cite').first().text()
        ).trim();
    const language = terminal
      ? 'shellsession'
      : /\.[ch]$/.test(title)
        ? 'c'
        : title.endsWith('.js')
          ? 'javascript'
          : title.endsWith('.peg')
            ? 'text'
            : 'zig';
    jobs.push(
      renderCodeFrame(pre.text(), {
        locale,
        language,
        title,
        terminal,
      }).then((rendered) => {
        const replacement = $(rendered);
        for (const selector of ['figure', 'figcaption', 'pre', 'code']) {
          const source =
            selector === 'figure' ? node : node.find(selector).first();
          const id = source.attr('id');
          if (id) replacement.find(selector).first().attr('id', id);
        }
        node.replaceWith(replacement);
      }),
    );
  });
  await Promise.all(jobs);
  return $.root().html() ?? '';
}

export async function enhanceIntroCodeBlocks(html, { locale = 'zh-cn' } = {}) {
  const $ = load(html, null, false);
  const jobs = [];
  $('pre').each((_, element) => {
    const pre = $(element);
    const figure = pre.closest('figure');
    const code = pre.find('code').first();
    const title = figure.find('figcaption').first().text().trim();
    const source = pre.text();
    const command =
      /^(?:\$\s|PS\s|(?:zig|winget|choco|scoop|brew|sudo|port|mkdir|cd|source|export)\b)/m.test(
        source,
      );
    const terminal = /^(?:shell|terminal)$/i.test(title) || command;
    const languageClass = code
      .attr('class')
      ?.split(/\s+/)
      .map((name) => name.replace(/^language-/, ''))
      .find((name) =>
        [
          'zig',
          'c',
          'bash',
          'sh',
          'powershell',
          'javascript',
          'json',
          'cpp',
          'text',
        ].includes(name),
      );
    const extensionLanguage = /\.zig$/i.test(title)
      ? 'zig'
      : /\.(?:c|h)$/i.test(title)
        ? 'c'
        : /\.js$/i.test(title)
          ? 'javascript'
          : undefined;
    const previousText = pre.prev('p').text();
    const language =
      extensionLanguage ??
      languageClass ??
      (/powershell/i.test(previousText)
        ? 'powershell'
        : terminal
          ? 'shellsession'
          : 'text');
    const ids = [
      figure.attr('id'),
      figure.find('figcaption').first().attr('id'),
      pre.attr('id'),
      code.attr('id'),
    ];
    jobs.push(
      renderCodeFrame(source, { locale, language, title, terminal }).then(
        (rendered) => {
          const replacement = load(rendered, null, false);
          const frame = replacement('.expressive-code').first();
          if (ids[0] || ids[2]) frame.attr('id', ids[0] ?? ids[2]);
          if (ids[1]) frame.find('.header').first().attr('id', ids[1]);
          if (ids[3]) frame.find('pre code').first().attr('id', ids[3]);
          if (figure.length) figure.replaceWith(frame);
          else pre.replaceWith(frame);
        },
      ),
    );
  });
  await Promise.all(jobs);
  return $.root().html() ?? '';
}

export async function getCodeFrameStyles() {
  const renderer = await getCodeFrameRenderer();
  return `/* Generated by scripts/extract.mjs from Expressive Code. */\n${renderer.baseStyles}\n${renderer.themeStyles}\n`;
}
