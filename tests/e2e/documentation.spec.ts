import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

interface DocumentMeta {
  id: string;
  kind: 'langref' | 'reference' | 'std';
  title: string;
  headings: { slug: string; text: string; depth: number }[];
  symbols?: {
    name: string;
    anchor: string;
    category: string;
    sourceLine: number;
  }[];
}

const english = JSON.parse(
  readFileSync(
    new URL('../../content/en/manifest.json', import.meta.url),
    'utf8',
  ),
) as DocumentMeta[];
const chinese = JSON.parse(
  readFileSync(
    new URL('../../content/zh-cn/manifest.json', import.meta.url),
    'utf8',
  ),
) as DocumentMeta[];
const base = '/zig-docs';
const seed = Number(process.env.E2E_SAMPLE_SEED ?? 1700);
let randomState = seed;
function sample(docs: DocumentMeta[], count: number) {
  return [...docs]
    .map((doc) => {
      randomState = (randomState * 16807) % 2147483647;
      return { doc, order: randomState };
    })
    .sort((left, right) => left.order - right.order)
    .slice(0, count)
    .map(({ doc }) => doc);
}

const sampledPages = [
  ...sample(
    english.filter((doc) => doc.kind !== 'std' && doc.headings.length),
    2,
  ),
  ...sample(
    english.filter((doc) => doc.kind === 'std' && doc.headings.length),
    2,
  ),
];

test('根地址进入中文概览，章节与模块来自真实清单', async ({ page }) => {
  await page.goto(`${base}/`);
  await expect(page).toHaveURL(new RegExp(`${base}/zh-cn/$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('0.17.0');
  await expect(page.locator('.chapter-index a')).toHaveCount(
    chinese.filter((doc) => doc.kind !== 'std').length,
  );
  await expect(page.locator('.module-index a')).toHaveCount(
    chinese.filter((doc) => doc.kind === 'std').length,
  );
  await page.getByRole('searchbox', { name: '筛选模块' }).fill('std.Io.Writer');
  await expect(page.locator('.module-index li:visible')).not.toHaveCount(0);
  await expect(page.locator('.module-index li:visible').first()).toContainText(
    'std.Io.Writer',
  );
  await page
    .getByRole('searchbox', { name: '筛选模块' })
    .fill('no-such-zig-module-1700');
  await expect(
    page.getByRole('status').filter({ hasText: '没有匹配的模块' }),
  ).toBeVisible();
});

for (const [locale, docs] of [
  ['en', english],
  ['zh-cn', chinese],
] as const) {
  test(`${locale} 模块面包屑仅链接清单中存在的祖先模块`, async ({ page }) => {
    const io = docs.find((doc) => doc.id === 'std/Io')!;
    expect(io).toBeDefined();
    await page.goto(`${base}/${locale}/std/Io/Writer/`);
    const breadcrumbs = page.locator('.breadcrumbs');
    const ioLink = breadcrumbs.getByRole('link', { name: 'Io', exact: true });
    await expect(ioLink).toHaveAttribute('href', `${base}/${locale}/std/Io/`);
    await ioLink.click();
    await expect(page).toHaveURL(new RegExp(`${base}/${locale}/std/Io/$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(io.title);

    expect(docs.some((doc) => doc.id === 'std/crypto/25519')).toBe(false);
    await page.goto(`${base}/${locale}/std/crypto/25519/scalar/`);
    await expect(
      breadcrumbs.getByRole('link', { name: 'crypto', exact: true }),
    ).toHaveAttribute('href', `${base}/${locale}/std/crypto/`);
    await expect(
      breadcrumbs.getByRole('link', { name: '25519', exact: true }),
    ).toHaveCount(0);
    await expect(
      breadcrumbs.locator('span').filter({ hasText: /^25519$/ }),
    ).toBeVisible();
  });
}

for (const doc of sampledPages) {
  test(`双语切换保留文档、锚点及深层刷新：${doc.id}，采样种子 ${seed}`, async ({
    page,
  }) => {
    const heading = doc.headings[Math.floor(doc.headings.length / 2)];
    const hash = `#${encodeURIComponent(heading.slug)}`;
    await page.goto(`${base}/en/${doc.id}/${hash}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(doc.title);
    await expect
      .poll(() =>
        page.evaluate(
          (id) => document.getElementById(id) !== null,
          heading.slug,
        ),
      )
      .toBe(true);
    await page
      .locator('zig-language-select select')
      .first()
      .selectOption(`${base}/zh-cn/${doc.id}/`);
    await expect(page).toHaveURL(new RegExp(`${base}/zh-cn/`));
    expect(decodeURIComponent(new URL(page.url()).hash)).toBe(
      `#${heading.slug}`,
    );
    const translated = chinese.find((entry) => entry.id === doc.id)!;
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      translated.title,
    );
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect
      .poll(() =>
        page.evaluate(
          (id) => document.getElementById(id) !== null,
          heading.slug,
        ),
      )
      .toBe(true);
    await page
      .locator('zig-language-select select')
      .first()
      .selectOption(`${base}/en/${doc.id}/`);
    await expect(page).toHaveURL(new RegExp(`${base}/en/`));
    expect(decodeURIComponent(new URL(page.url()).hash)).toBe(
      `#${heading.slug}`,
    );
  });
}

for (const [locale, query] of [
  ['zh-cn', '内存'],
  ['en', 'allocator'],
] as const) {
  test(`${locale} 全文搜索支持键盘打开、结果跳转与关闭`, async ({ page }) => {
    await page.goto(`${base}/${locale}/`);
    await expect(page.locator('[data-open-modal]')).toBeEnabled();
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="text"]').fill(query);
    const result = dialog.locator('.pagefind-ui__result-link').first();
    await expect(result).toBeVisible({ timeout: 20_000 });
    const href = await result.getAttribute('href');
    expect(href).toContain(`${base}/${locale}/`);
    await result.click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
}

for (const locale of ['en', 'zh-cn']) {
  test(`${locale} 标准库完整接口名进入搜索索引`, async ({ page }) => {
    await page.goto(`${base}/${locale}/`);
    await page.locator('[data-open-modal]').click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="text"]').fill('std.Io.Writer');
    await expect(
      dialog.locator('.pagefind-ui__result-link').first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(dialog.locator('.pagefind-ui__results')).toContainText(
      'Writer',
    );
  });
}

test('主题持久化、代码复制与官方来源', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const doc =
    english.find((entry) => entry.id === 'reference/Hello-World') ??
    english.find((entry) => entry.kind !== 'std')!;
  await page.goto(`${base}/en/${doc.id}/`);
  const theme = page.locator('.desktop-theme select');
  await theme.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await theme.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const code = page.locator('.doc-content pre').first();
  await expect(code).toBeVisible();
  await code.getByRole('button', { name: 'Copy code' }).click();
  await expect(code.getByRole('button')).toHaveText('Copied');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard.trim().length).toBeGreaterThan(10);
  expect(clipboard).not.toContain('Copy code');
  await expect(page.locator('.document-meta a')).toHaveAttribute(
    'href',
    /https:\/\/ziglang\.org\//,
  );
});

test('移动端导航可打开、选择章节、按退出键关闭，页面无水平溢出', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${base}/zh-cn/`);
  const toggle = page.locator('button[popovertarget="starlight__sidebar"]');
  await toggle.click();
  await expect(page.locator('#starlight__sidebar')).toBeVisible();
  const entry = chinese.find((doc) => doc.kind !== 'std')!;
  await page
    .locator(`#starlight__sidebar a[href="${base}/zh-cn/${entry.id}/"]`)
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title);
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#starlight__sidebar')).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test('所有本地资源请求成功，阅读正文不发生明显布局偏移', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', (response) => {
    if (
      response.url().startsWith('http://127.0.0.1:4323') &&
      response.status() >= 400
    )
      failures.push(response.url());
  });
  await page.addInitScript(() => {
    let score = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!shift.hadRecentInput) score += shift.value;
      }
      (window as Window & { layoutShiftScore?: number }).layoutShiftScore =
        score;
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(
    `${base}/en/${english.find((doc) => doc.kind !== 'std')!.id}/`,
  );
  await page.waitForLoadState('networkidle');
  expect(failures).toEqual([]);
  const metrics = await page.evaluate(() => ({
    cls:
      (window as Window & { layoutShiftScore?: number }).layoutShiftScore ?? 0,
    dom: document.querySelectorAll('*').length,
  }));
  expect(metrics.cls).toBeLessThan(0.1);
  expect(metrics.dom).toBeLessThan(20_000);
});

const apiCases = [
  {
    id: 'std/array_list',
    name: 'std.array_list.Aligned',
    selectors: [
      '.api-prototype',
      '.api-parameters',
      '.api-fields',
      '.api-members',
    ],
  },
  {
    id: 'std/Io/Writer',
    name: 'std.Io.Writer.Allocating',
    selectors: ['.api-fields', '.api-members'],
  },
  {
    id: 'std/Io/Reader',
    name: 'std.Io.Reader.allocRemaining',
    selectors: ['.api-prototype', '.api-parameters'],
  },
  { id: 'std/Io/Writer', name: 'std.Io.Writer.Error', selectors: ['dl'] },
  {
    id: 'std/os/linux',
    name: 'std.os.linux.accept',
    selectors: ['.api-prototype', '.api-parameters'],
  },
  {
    id: 'std/os/windows',
    name: 'std.os.windows.ACCESS_MASK.Specific.Directory',
    selectors: ['.api-fields'],
  },
];

for (const locale of ['en', 'zh-cn']) {
  for (const entry of apiCases) {
    test(`${locale} 接口结构、源码定位及刷新：${entry.name}`, async ({
      page,
    }) => {
      const meta = english.find((doc) => doc.id === entry.id)!;
      const symbol = meta.symbols!.find((item) => item.name === entry.name)!;
      expect(symbol).toBeDefined();
      await page.goto(
        `${base}/${locale}/${entry.id}/#${encodeURIComponent(symbol.anchor)}`,
      );
      const api = page.locator(
        `.api-entry[id=${JSON.stringify(symbol.anchor)}]`,
      );
      await expect(api).toHaveAttribute('id', symbol.anchor);
      for (const selector of entry.selectors)
        await expect(api.locator(selector).first()).toBeVisible();
      await api.locator('.api-source a').click();
      await expect(page.locator('details.source-code')).toHaveAttribute(
        'open',
        '',
      );
      await expect(page.locator(`[id="L${symbol.sourceLine}"]`)).toBeVisible();
      await page.reload();
      await expect(page.locator('details.source-code')).toHaveAttribute(
        'open',
        '',
      );
      const other = locale === 'en' ? 'zh-cn' : 'en';
      await page
        .locator('zig-language-select select')
        .first()
        .selectOption(`${base}/${other}/${entry.id}/`);
      await expect(page).toHaveURL(
        new RegExp(`${base}/${other}/${entry.id}/#L${symbol.sourceLine}$`),
      );
      await expect(page.locator('details.source-code')).toHaveAttribute(
        'open',
        '',
      );
    });
  }
}

test('内置函数保留官方锚点并切换到同一中文段落', async ({ page }) => {
  const meta = english.find((doc) =>
    doc.headings.some((heading) => heading.slug === 'alignOf'),
  )!;
  expect(meta).toBeDefined();
  await page.goto(`${base}/en/${meta.id}/#alignOf`);
  await expect(page.locator('[id="alignOf"]')).toBeVisible();
  await page
    .locator('zig-language-select select')
    .first()
    .selectOption(`${base}/zh-cn/${meta.id}/`);
  await expect(page).toHaveURL(
    new RegExp(`${base}/zh-cn/${meta.id}/#alignOf$`),
  );
  await expect(page.locator('[id="alignOf"]')).toBeVisible();
});

for (const [locale, id] of [
  ['en', 'std/os/linux'],
  ['zh-cn', 'std/c'],
]) {
  test(`大型标准库模块的资源和首屏性能预算：${locale}/${id}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last)
          (window as Window & { docLcp?: number }).docLcp = last.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(`${base}/${locale}/${id}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      english.find((doc) => doc.id === id)!.title,
    );
    await page.waitForLoadState('networkidle');
    const metrics = await page.evaluate(() => ({
      lcp: (window as Window & { docLcp?: number }).docLcp ?? 0,
      domContentLoaded: (
        performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming
      ).domContentLoadedEventEnd,
      bytes: (
        performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming
      ).decodedBodySize,
    }));
    await testInfo.attach('large-module-performance.json', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    });
    expect(metrics.lcp).toBeGreaterThan(0);
    expect(metrics.lcp).toBeLessThan(5000);
    expect(metrics.domContentLoaded).toBeLessThan(5000);
    expect(metrics.bytes).toBeLessThan(5 * 1024 * 1024);
  });
}
