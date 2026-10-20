import { load } from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import { categories, symbolHref } from './std-runtime.mjs';

export function pageId(path) {
  return path === 'std/std.zig' ? 'std' : path.replace(/\.zig$/, '');
}

const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export function declarationAnchors(records) {
  const anchors = new Map();
  const used = new Set();
  for (const record of records) {
    let anchor = record.fqn;
    if (used.has(anchor)) anchor += `--L${record.sourceLine}`;
    if (used.has(anchor)) anchor += `-${record.id}`;
    used.add(anchor);
    anchors.set(record.id, anchor);
  }
  return anchors;
}

export function symbolTargets(runtime, sourcePages, anchors) {
  const { declarations, findDeclaration } = runtime;
  const candidates = new Map();
  const ambiguous = new Set();
  for (const declaration of declarations.values()) {
    const previous = candidates.get(declaration.fqn);
    if (previous) ambiguous.add(declaration.fqn);
    if (!previous || (previous.category === 7 && declaration.category !== 7))
      candidates.set(declaration.fqn, declaration);
  }
  const targets = new Map();
  const unresolved = new Set();
  function requireDeclaration(id, name) {
    const declaration = declarations.get(id);
    if (!declaration)
      throw new Error(
        `Officially resolvable symbol was not collected: ${name}`,
      );
    return declaration;
  }
  function targetFor(declaration, name) {
    const visited = new Set();
    while (declaration.category === 7 && !visited.has(declaration.id)) {
      visited.add(declaration.id);
      declaration = requireDeclaration(declaration.aliasee, name);
    }
    const page = sourcePages.get(declaration.sourcePath);
    const anchor = anchors.get(declaration.id);
    if (!page || !anchor) throw new Error(`Unmapped symbol target: ${name}`);
    const target = { page, anchor };
    targets.set(name, target);
    return target;
  }
  for (const [name, fallback] of candidates) {
    const id = ambiguous.has(name) ? findDeclaration(name) : null;
    targetFor(id === null ? fallback : requireDeclaration(id, name), name);
  }
  targets.resolve = (name) => {
    if (targets.has(name)) return targets.get(name);
    if (unresolved.has(name)) return null;
    const id = findDeclaration(name);
    if (id === null) {
      unresolved.add(name);
      return null;
    }
    return targetFor(requireDeclaration(id, name), name);
  };
  return targets;
}

export function exactSourceHtml(html, source) {
  const actual = load(`<code>${html}</code>`, null, false)('code').text();
  if (actual === source) return html;
  const offset = actual ? source.indexOf(actual) : -1;
  if (offset >= 0) {
    const prefix = source.slice(0, offset);
    const suffix = source.slice(offset + actual.length);
    if (/^(?:\s|\/\/[^\n]*(?:\n|$))*$/.test(prefix) && /^\s*$/.test(suffix))
      return `${prefix ? `<span class="tok-comment">${escape(prefix)}</span>` : ''}${html}${escape(suffix)}`;
  }
  throw new Error('Source highlighting changes original source bytes');
}

export function rewriteLinks(
  html,
  symbolPages,
  sourcePages,
  locale,
  unresolved,
) {
  const $ = load(html, null, false);
  const localAnchors = new Set(
    $('[id]')
      .map((_, el) => $(el).attr('id'))
      .get(),
  );
  $('script,iframe,object,embed').remove();
  $('*').each((_, element) => {
    for (const key of Object.keys(element.attribs ?? {}))
      if (/^on/i.test(key)) $(element).removeAttr(key);
  });
  $('a[href]').each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr('href');
    if (/^javascript:/i.test(href)) {
      anchor.removeAttr('href');
      return;
    }
    let hash = href;
    const official = 'https://ziglang.org/documentation/0.17.0/std/';
    if (hash.startsWith(official)) hash = hash.slice(official.length);
    if (hash.startsWith('#src/')) {
      const path = decodeURIComponent(hash.slice(5));
      const page = sourcePages.get(path);
      anchor.attr(
        'href',
        page
          ? `/zig-docs/${locale}/${page.split('/').map(encodeURIComponent).join('/')}/#source`
          : `${official}${hash}`,
      );
    } else if (hash.startsWith('#std')) {
      const name = decodeURIComponent(hash.slice(1));
      if (name.includes('--L') && localAnchors.has(name)) return;
      const target = symbolHref(name, symbolPages, locale);
      if (!target) unresolved.add(name);
      anchor.attr('href', target ?? `${official}#${encodeURIComponent(name)}`);
    }
  });
  return $.html();
}

export function renderDeclaration(
  runtime,
  declaration,
  rootId,
  locale,
  anchors,
) {
  const { ex, string, numbers, declarations } = runtime;
  const { id, category, fqn, aliasee } = declaration;
  const parts = [];
  if (id !== rootId) {
    parts.push(
      `<section class="api-entry" id="${escape(anchors.get(id))}"><h3><code>${escape(fqn)}</code></h3>`,
    );
    const categoryLabels = [
      '命名空间',
      '容器',
      '变量',
      '函数',
      '原始类型',
      '错误集合',
      '常量',
      '别名',
      '类型',
      '元类型',
      '类型函数',
    ];
    parts.push(
      `<p class="api-kind">${escape(locale === 'en' ? categories[category] : categoryLabels[category])}</p>`,
    );
  }
  parts.push(
    `<p class="api-source" data-pagefind-ignore><a href="#L${declaration.sourceLine}">${locale === 'en' ? 'Source line' : '源码行'} ${declaration.sourceLine}</a></p>`,
  );
  const docs = string(ex.decl_docs_html(id, false));
  if (docs) parts.push(`<div class="api-description">${docs}</div>`);
  if (category === 7) {
    const target = declarations.get(aliasee);
    if (target)
      parts.push(
        `<p>${locale === 'en' ? 'Alias of' : '别名目标'} <a href="#${escape(target.fqn)}"><code>${escape(target.fqn)}</code></a></p>`,
      );
  } else if (category === 3 || category === 10) {
    const prototype = string(ex.decl_fn_proto_html(id, false));
    if (prototype)
      parts.push(`<pre class="api-prototype"><code>${prototype}</code></pre>`);
    const parameters = numbers(ex.decl_params(id));
    if (parameters.length) {
      parts.push(
        `<h4>${locale === 'en' ? 'Parameters' : '参数'}</h4><div class="api-parameters">`,
      );
      for (const parameter of parameters)
        parts.push(string(ex.decl_param_html(id, parameter)));
      parts.push('</div>');
    }
    const errorNode = ex.fn_error_set(id);
    if (errorNode) {
      const base = ex.fn_error_set_decl(id, errorNode);
      const errors = numbers(ex.error_set_node_list(id, errorNode), 64);
      if (errors.length) {
        parts.push(`<h4>${locale === 'en' ? 'Errors' : '错误'}</h4><dl>`);
        for (const error of errors)
          parts.push(string(ex.error_html(base, error)));
        parts.push('</dl>');
      }
    }
  } else if (category === 5) {
    const errors = numbers(ex.decl_error_set(id), 64);
    if (errors.length) {
      parts.push(`<h4>${locale === 'en' ? 'Errors' : '错误'}</h4><dl>`);
      for (const error of errors) parts.push(string(ex.error_html(id, error)));
      parts.push('</dl>');
    }
  } else if (id !== rootId && category !== 0 && category !== 1) {
    const type = string(ex.decl_type_html(id));
    if (type)
      parts.push(`<pre class="api-prototype"><code>${type}</code></pre>`);
  }
  const fields =
    category === 10
      ? numbers(ex.type_fn_fields(id))
      : numbers(ex.decl_fields(id));
  if (fields.length) {
    parts.push(
      `<h4>${locale === 'en' ? 'Fields' : '字段'}</h4><div class="api-fields">`,
    );
    for (const field of fields)
      parts.push(string(ex.decl_field_html(id, field)));
    parts.push('</div>');
  }
  const members = runtime.members(id, category);
  if (members.length) {
    parts.push(`<div class="api-members"><ul>`);
    for (const memberId of members) {
      const member = declarations.get(memberId);
      if (member)
        parts.push(
          `<li><a href="#${escape(anchors.get(memberId) ?? member.fqn)}"><code>${escape(member.name)}</code></a></li>`,
        );
    }
    parts.push('</ul></div>');
  }
  const doctest = string(ex.decl_doctest_html(id));
  if (doctest)
    parts.push(
      `<h4>${locale === 'en' ? 'Example usage' : '用法示例'}</h4><pre><code>${doctest}</code></pre>`,
    );
  if (id !== rootId) parts.push('</section>');
  return parts.join('\n');
}

export async function renderStandardLibrary(runtime, locale = 'en') {
  const { roots, declarations, ex, string } = runtime;
  const sourcePages = new Map([...roots].map(([path]) => [path, pageId(path)]));
  const groups = new Map([...roots].map(([path]) => [path, []]));
  const collisions = [];
  const namePages = new Map();
  for (const declaration of declarations.values()) {
    const { fqn, sourcePath } = declaration;
    if (!sourcePages.has(sourcePath))
      throw new Error(`Unmapped source: ${sourcePath}`);
    const page = sourcePages.get(sourcePath);
    if (namePages.has(fqn) && namePages.get(fqn) !== page) collisions.push(fqn);
    if (!namePages.has(fqn)) namePages.set(fqn, page);
    groups.get(sourcePath).push(declaration);
  }
  const anchors = new Map();
  for (const [sourcePath, records] of groups) {
    const rootId = roots.get(sourcePath);
    records.sort((a, b) =>
      a.id === rootId
        ? -1
        : b.id === rootId
          ? 1
          : a.fqn.localeCompare(b.fqn, 'en'),
    );
    for (const [id, anchor] of declarationAnchors(records))
      anchors.set(id, anchor);
  }
  const symbolPages = symbolTargets(runtime, sourcePages, anchors);
  const manifest = [];
  const inventory = [];
  const unresolved = new Set();
  for (const [sourcePath, rootId] of roots) {
    const id = sourcePages.get(sourcePath);
    const root = declarations.get(rootId);
    const records = groups.get(sourcePath);
    const symbols = [];
    const fragments = [`<div id="${escape(root.fqn)}"></div>`];
    for (const declaration of records) {
      const symbol = {
        id: `${sourcePath}:${declaration.sourceLine}:${declaration.id}`,
        name: declaration.fqn,
        anchor: anchors.get(declaration.id),
        category: categories[declaration.category],
        sourceLine: declaration.sourceLine,
      };
      symbols.push(symbol);
      inventory.push({ ...symbol, page: id, sourcePath });
      fragments.push(
        renderDeclaration(runtime, declaration, rootId, locale, anchors),
      );
    }
    const sourceText = runtime.files.get(sourcePath).toString();
    const highlightedSource = exactSourceHtml(
      string(ex.decl_source_html(rootId)),
      sourceText,
    );
    const lineCount =
      sourceText.split('\n').length - Number(sourceText.endsWith('\n'));
    const lineNumbers = Array.from(
      { length: lineCount },
      (_, line) =>
        `<a id="L${line + 1}" href="#L${line + 1}" tabindex="-1">${line + 1}</a>`,
    ).join('\n');
    fragments.push(
      `<details class="source-code" id="source" data-pagefind-ignore><summary>${locale === 'en' ? 'Source code' : '源码'}</summary><p><code>${escape(sourcePath)}</code></p><div class="source-grid"><pre class="line-numbers" aria-hidden="true" data-copy-ignore><code>${lineNumbers}</code></pre><pre class="source-listing"><code>${highlightedSource}</code></pre></div></details>`,
    );
    const html = rewriteLinks(
      fragments.join('\n'),
      symbolPages,
      sourcePages,
      locale,
      unresolved,
    );
    const meta = {
      id,
      kind: 'std',
      title: root.fqn,
      sourcePath,
      sourceUrl: `https://ziglang.org/documentation/0.17.0/std/#${encodeURIComponent(root.fqn)}`,
      file: `${id}.json`,
      headings: [
        { depth: 2, slug: root.fqn, text: root.fqn },
        ...symbols
          .filter((symbol) => symbol.anchor !== root.fqn)
          .map((symbol) => ({
            depth: 3,
            slug: symbol.anchor,
            text: symbol.name,
          })),
        {
          depth: 2,
          slug: 'source',
          text: locale === 'en' ? 'Source code' : '源码',
        },
      ],
      symbols,
    };
    const target = new URL(
      `../../content/${locale}/${meta.file}`,
      import.meta.url,
    );
    await mkdir(new URL('./', target), { recursive: true });
    await writeFile(target, `${JSON.stringify({ ...meta, html })}\n`);
    manifest.push(meta);
  }
  return {
    manifest,
    stats: {
      sourceFiles: roots.size,
      declarations: declarations.size,
      uniqueNames: symbolPages.size,
      aliasNameDuplicates: collisions,
      unresolvedReferences: [...unresolved].sort(),
      upstreamWarnings: [...runtime.warnings],
    },
    symbolPages,
    inventory,
  };
}
