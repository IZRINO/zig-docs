import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { StarlightPageProps } from '@astrojs/starlight/props';

export const locales = ['zh-cn', 'en'] as const;
export type Locale = (typeof locales)[number];
export interface Heading {
  depth: number;
  slug: string;
  text: string;
}
export interface DocumentMeta {
  id: string;
  kind: 'langref' | 'reference' | 'std';
  title: string;
  sourceUrl: string;
  file: string;
  headings: Heading[];
  sourcePath?: string;
  symbols?: { name: string; anchor: string; category: string }[];
}
export interface DocumentPage extends DocumentMeta {
  html: string;
}

const manifestCache = new Map<Locale, Promise<DocumentMeta[]>>();
const contentRoot = resolve(process.cwd(), 'content');

export function manifest(locale: Locale): Promise<DocumentMeta[]> {
  let result = manifestCache.get(locale);
  if (!result) {
    result = readFile(
      resolve(contentRoot, locale, 'manifest.json'),
      'utf8',
    ).then((raw) => JSON.parse(raw) as DocumentMeta[]);
    manifestCache.set(locale, result);
  }
  return result;
}

export async function readDocument(
  locale: Locale,
  meta: DocumentMeta,
): Promise<DocumentPage> {
  const raw = await readFile(resolve(contentRoot, locale, meta.file), 'utf8');
  return JSON.parse(raw) as DocumentPage;
}

export function docHref(locale: Locale, id = ''): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${locale}/${id ? `${id}/` : ''}`;
}

export function currentDocument(pathname: string): {
  locale: Locale;
  id: string;
} {
  const withoutBase = pathname.slice(
    import.meta.env.BASE_URL.replace(/\/$/, '').length,
  );
  const [locale, ...parts] = decodeURI(withoutBase).split('/').filter(Boolean);
  return { locale: locale === 'en' ? 'en' : 'zh-cn', id: parts.join('/') };
}

export const labels = {
  'zh-cn': {
    home: '文档概览',
    reference: '语言参考',
    library: '标准库',
    modules: '相关模块',
    source: '官方原文',
    sourceCode: '源码',
    version: '固定版本',
    siteDescription: '语言参考与标准库，中英文对照阅读。',
    referenceDescription: '从语法、类型与内存模型，到编译期计算和内置函数。',
    libraryDescription: '按模块浏览接口、参数、字段、错误和源码。',
    referenceIndex: '章节索引',
    libraryIndex: '模块索引',
    chapterCount: '个章节',
    moduleCount: '个模块',
    readReference: '阅读语言参考',
    browseLibrary: '浏览标准库',
    language: '切换语言',
    copy: '复制代码',
    copied: '已复制',
    copyFailed: '复制失败，请手动选择代码',
    previous: '上一章',
    next: '下一章',
    onThisPage: '本页接口',
    allModules: '全部模块',
    filterModules: '筛选模块',
    noModules: '没有匹配的模块',
    attribution: '基于 Zig 官方文档。中文译文由本项目维护。',
    disclaimer: '非官方中文文档',
    repository: '项目仓库',
    viewSource: '查看官方原文',
  },
  en: {
    home: 'Documentation',
    reference: 'Language reference',
    library: 'Standard library',
    modules: 'Related modules',
    source: 'Official documentation',
    sourceCode: 'Source',
    version: 'Version snapshot',
    siteDescription:
      'Language reference and standard library, in Chinese and English.',
    referenceDescription:
      'Syntax, types, and memory semantics through compile-time execution and builtins.',
    libraryDescription:
      'Explore APIs, parameters, fields, errors, and source by module.',
    referenceIndex: 'Chapter index',
    libraryIndex: 'Module index',
    chapterCount: 'chapters',
    moduleCount: 'modules',
    readReference: 'Read the language reference',
    browseLibrary: 'Browse the standard library',
    language: 'Change language',
    copy: 'Copy code',
    copied: 'Copied',
    copyFailed: 'Copy failed. Select the code to copy it manually.',
    previous: 'Previous chapter',
    next: 'Next chapter',
    onThisPage: 'APIs on this page',
    allModules: 'All modules',
    filterModules: 'Filter modules',
    noModules: 'No matching modules',
    attribution:
      'Based on the official Zig documentation. Chinese translations are maintained by this project.',
    disclaimer: 'Unofficial Chinese documentation',
    repository: 'Repository',
    viewSource: 'Read the official documentation',
  },
} as const;

export function makeSidebar(
  locale: Locale,
  docs: DocumentMeta[],
  currentId = '',
): StarlightPageProps['sidebar'] {
  const t = labels[locale];
  const current = currentId.split('/');
  const standardLibrary = docs.filter((doc) => {
    if (doc.kind !== 'std') return false;
    const parts = doc.id.split('/');
    if (parts.length <= 2) return true;
    return (
      (currentId.startsWith('std/') &&
        parts.slice(0, -1).join('/') === current.slice(0, -1).join('/')) ||
      parts.slice(0, -1).join('/') === currentId ||
      currentId.startsWith(`${doc.id}/`)
    );
  });
  return [
    { label: t.home, link: '/' },
    {
      label: t.reference,
      collapsed: currentId.startsWith('std'),
      items: docs
        .filter((doc) => doc.kind !== 'std')
        .map((doc) => ({ label: doc.title, link: `/${doc.id}/` })),
    },
    {
      label: t.library,
      collapsed: !currentId.startsWith('std'),
      items: standardLibrary
        .sort((a, b) => a.id.localeCompare(b.id, 'en'))
        .map((doc) => ({
          label:
            doc.id === 'std'
              ? t.allModules
              : doc.id.slice(4).replaceAll('/', '.'),
          link: `/${doc.id}/`,
        })),
    },
  ];
}
