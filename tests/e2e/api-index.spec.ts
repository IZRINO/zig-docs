import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const docs = JSON.parse(
  readFileSync(
    new URL('../../content/en/manifest.json', import.meta.url),
    'utf8',
  ),
) as {
  id: string;
  symbols: { name: string; anchor: string }[];
}[];
const module = docs.find((doc) => doc.id === 'std/c')!;
const apis = module.symbols.slice(1);
const base = '/zig-docs';

for (const locale of ['en', 'zh-cn']) {
  test(`${locale} 大型模块接口索引可筛选、分页并使用键盘定位全部接口`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/${locale}/std/c/`);
    const index = page.locator('.compact-api-toc zig-api-index');
    await expect(index).toHaveAttribute('data-ready', 'true');
    await expect(index).toHaveAttribute(
      'data-total',
      String(await page.locator('.api-entry[id]').count()),
    );
    await expect(
      page.locator('starlight-toc, mobile-starlight-toc'),
    ).toHaveCount(0);
    const links = index.locator('[data-api-results] a');
    await expect(links).toHaveCount(40);
    await index.locator('[data-page-next]').click();
    await expect(links.first()).toHaveAttribute(
      'href',
      `#${encodeURIComponent(apis[40].anchor)}`,
    );
    const lastPage = Math.ceil(apis.length / 40);
    await index.locator('input[type="number"]').fill(String(lastPage));
    await index.locator('input[type="number"]').press('Enter');
    await expect(links.last()).toHaveAttribute(
      'href',
      `#${encodeURIComponent(module.symbols.at(-1)!.anchor)}`,
    );
    const last = module.symbols.at(-1)!;
    const search = index.locator('input[type="search"]');
    await search.fill(last.name);
    const firstMatch = module.symbols.find((symbol) =>
      symbol.name.toLocaleLowerCase().includes(last.name.toLocaleLowerCase()),
    )!;
    await expect(links.first()).toHaveAttribute(
      'href',
      `#${encodeURIComponent(firstMatch.anchor)}`,
    );
    await search.press('ArrowDown');
    await expect(links.first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect
      .poll(() => decodeURIComponent(new URL(page.url()).hash))
      .toBe(`#${firstMatch.anchor}`);
    await expect(
      page.locator(`.api-entry[id=${JSON.stringify(firstMatch.anchor)}]`),
    ).toBeVisible();
    await search.fill('no-such-api-1700');
    await expect(links).toHaveCount(0);
    await expect(index.locator('[role="status"]')).toHaveText(
      locale === 'en' ? 'No matching APIs' : '没有匹配的接口',
    );
  });
}

test('移动端大型模块目录可按键盘和外部点击关闭，接口跳转后收起', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/zh-cn/std/c/`);
  const details = page.locator('#zig-mobile-api-index');
  const summary = details.locator('summary');
  const index = details.locator('zig-api-index');
  await expect(index).toHaveAttribute('data-ready', 'true');
  await summary.click();
  const search = index.locator('input[type="search"]');
  await search.focus();
  await page.keyboard.press('Escape');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  await summary.click();
  await page.locator('header.header').click({ position: { x: 1, y: 1 } });
  await expect(details).not.toHaveAttribute('open', '');
  await summary.click();
  const last = module.symbols.at(-1)!;
  await search.fill(last.name);
  await index.locator('[data-api-results] a').first().click();
  await expect(details).not.toHaveAttribute('open', '');
  await expect(
    page.locator(`.api-entry[id=${JSON.stringify(last.anchor)}]`),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test('小型模块继续使用默认章节目录', async ({ page }) => {
  await page.goto(`${base}/en/std/Io/Writer/`);
  await expect(page.locator('starlight-toc')).toHaveCount(1);
  await expect(page.locator('mobile-starlight-toc')).toHaveCount(1);
  await expect(page.locator('zig-api-index')).toHaveCount(0);
});
