import { readFileSync, mkdirSync } from 'node:fs';
import { load } from 'cheerio';
import { test, expect } from '@playwright/test';

const base = '/zig-docs';

test('语言参考与标准库的明暗主题高亮文本对比度达标', async ({ page }) => {
  for (const route of ['reference/Slices', 'std/ascii']) {
    await page.goto(`${base}/zh-cn/${route}/`);
    for (const theme of ['light', 'dark']) {
      await page
        .locator('starlight-theme-select select')
        .first()
        .selectOption(theme);
      const colors = await page.evaluate(() => {
        const luminance = (rgb: string) => {
          const channels = rgb
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((n) => {
              const value = n / 255;
              return value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4;
            });
          return (
            channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
          );
        };
        const pairs = new Map<string, number>();
        document
          .querySelectorAll<HTMLElement>('.doc-content pre span')
          .forEach((span) => {
            if (!span.textContent?.trim()) return;
            const fg = getComputedStyle(span).color;
            const bg = getComputedStyle(span.closest('pre')!).backgroundColor;
            const [low, high] = [luminance(fg), luminance(bg)].sort(
              (a, b) => a - b,
            );
            pairs.set(`${fg} on ${bg}`, (high + 0.05) / (low + 0.05));
          });
        return [...pairs].map(([pair, contrast]) => ({ pair, contrast }));
      });
      expect(colors.length).toBeGreaterThan(3);
      for (const color of colors) {
        expect(
          color.contrast,
          `${route} ${theme}: ${color.pair}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

for (const locale of ['en', 'zh-cn']) {
  test(`${locale} 示例和命令输出逐字复制，标题栏与代码互不遮挡`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      const originalWrite = navigator.clipboard.writeText.bind(
        navigator.clipboard,
      );
      navigator.clipboard.writeText = async (text) => {
        (window as Window & { copiedSource?: string }).copiedSource = text;
        await originalWrite(text);
      };
    });
    const doc = JSON.parse(
      readFileSync(`content/${locale}/reference/Hello-World.json`, 'utf8'),
    );
    const $ = load(doc.html, null, false);
    const expected = $('pre')
      .map((_, el) => $(el).text())
      .get();
    await page.goto(`${base}/${locale}/reference/Hello-World/`);
    await page.evaluate(() => document.fonts.ready);
    const frames = page.locator('.expressive-code .frame');
    await expect(frames).toHaveCount(expected.length);
    for (let i = 0; i < expected.length; i++) {
      const frame = frames.nth(i);
      const button = frame.locator('.copy-code');
      await button.click();
      expect(
        await page.evaluate(
          () => (window as Window & { copiedSource?: string }).copiedSource,
        ),
      ).toBe(expected[i]);
      // Windows normalizes clipboard line endings to CRLF after writeText.
      const clipboard = await page.evaluate(() =>
        navigator.clipboard.readText(),
      );
      expect(clipboard.replaceAll('\r\n', '\n')).toBe(expected[i]);
      const header = await frame.locator('.header').boundingBox();
      const pre = await frame.locator('pre').boundingBox();
      const control = await button.boundingBox();
      expect(header && pre && control).toBeTruthy();
      expect(control!.y + control!.height).toBeLessThanOrEqual(pre!.y + 1);
      await expect(frame.locator('pre')).toHaveAttribute('tabindex', '0');
    }
    const terminalTitle = locale === 'en' ? 'Terminal' : '命令行';
    await expect(page.locator('.frame.is-terminal .title')).toHaveText([
      terminalTitle,
      terminalTitle,
    ]);
  });
}

test('字号控件同步调整正文与代码并在刷新后保留', async ({ page }) => {
  await page.goto(`${base}/zh-cn/reference/Slices/`);
  await page.evaluate(() => localStorage.removeItem('zig-docs-font-scale'));
  await page.reload();
  const paragraph = page.locator('.doc-content > p').first();
  const code = page.locator('.expressive-code pre > code').first();
  const before = await paragraph.evaluate((node) =>
    parseFloat(getComputedStyle(node).fontSize),
  );
  const codeBefore = await code.evaluate((node) =>
    parseFloat(getComputedStyle(node).fontSize),
  );
  await page.getByRole('button', { name: '增大字号' }).click();
  await expect
    .poll(() =>
      paragraph.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
    )
    .toBeGreaterThan(before);
  await expect
    .poll(() =>
      code.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
    )
    .toBeGreaterThan(codeBefore);
  await page.reload();
  await expect
    .poll(() =>
      paragraph.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
    )
    .toBeGreaterThan(before);
  await page.getByRole('button', { name: '重置字号' }).click();
  await expect
    .poll(() =>
      paragraph.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
    )
    .toBe(before);
});

for (const width of [390, 768, 1004, 1440]) {
  test(`${width}px 开源字体、双语布局、主题和资源载荷`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const failures: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(response.url());
    });
    await page.addInitScript(() => {
      let cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) cls += shift.value;
        }
        (window as Window & { readingCls?: number }).readingCls = cls;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    for (const locale of ['zh-cn', 'en']) {
      await page.goto(`${base}/${locale}/reference/Slices/`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      const metrics = await page.evaluate(() => {
        const paragraph = document.querySelector('.doc-content > p')!;
        const code = document.querySelector('.expressive-code pre > code')!;
        const fonts = [...document.fonts]
          .filter((face) => face.status === 'loaded')
          .map((face) => face.family);
        const resources = performance.getEntriesByType(
          'resource',
        ) as PerformanceResourceTiming[];
        return {
          fonts,
          bodySize: parseFloat(getComputedStyle(paragraph).fontSize),
          codeSize: parseFloat(getComputedStyle(code).fontSize),
          tracking: getComputedStyle(document.querySelector('h1')!)
            .letterSpacing,
          overflow: document.documentElement.scrollWidth > innerWidth,
          cls: (window as Window & { readingCls?: number }).readingCls ?? 0,
          fontBytes: resources
            .filter((r) => r.name.includes('.woff2'))
            .reduce((sum, r) => sum + r.encodedBodySize, 0),
          remoteFonts: resources
            .filter(
              (r) =>
                r.name.includes('.woff2') &&
                !r.name.startsWith(location.origin),
            )
            .map((r) => r.name),
        };
      });
      expect(metrics.fonts).toContain('Source Sans 3 Variable');
      expect(metrics.fonts).toContain('JetBrains Mono Variable');
      if (locale === 'zh-cn') {
        expect(metrics.fonts).toContain('Noto Sans SC Variable');
        expect(['normal', '0px']).toContain(metrics.tracking);
      }
      expect(metrics.bodySize).toBe(width < 800 ? 17 : 18);
      expect(metrics.codeSize).toBe(width < 800 ? 14 : 15);
      expect(metrics.overflow).toBe(false);
      expect(metrics.cls).toBeLessThan(0.1);
      expect(metrics.fontBytes).toBeLessThan(1.5 * 1024 * 1024);
      expect(metrics.remoteFonts).toEqual([]);
      await testInfo.attach(`${locale}-reading-metrics.json`, {
        body: JSON.stringify(metrics, null, 2),
        contentType: 'application/json',
      });
      for (const theme of ['light', 'dark']) {
        const select = page.locator('starlight-theme-select select').first();
        // The select is hidden in the mobile header; use the visible menu controls there.
        if (width >= 800) {
          await select.selectOption(theme);
        } else {
          await page
            .locator('button[popovertarget="starlight__sidebar"]')
            .click();
          await page
            .locator('#starlight__sidebar starlight-theme-select select')
            .selectOption(theme);
          await page.keyboard.press('Escape');
        }
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const token = await page
          .locator('.ec-line span[style]')
          .first()
          .evaluate((el, theme) => {
            const style = getComputedStyle(el);
            const probe = document.createElement('span');
            probe.style.color = style.getPropertyValue(
              theme === 'light' ? '--0' : '--1',
            );
            document.body.append(probe);
            const expected = getComputedStyle(probe).color;
            probe.remove();
            return { actual: style.color, expected };
          }, theme);
        expect(token.actual).toBe(token.expected);
        if (
          locale === 'zh-cn' &&
          ((width === 1440 && theme === 'light') ||
            (width === 390 && theme === 'dark'))
        ) {
          mkdirSync('.cache/reading-screenshots', { recursive: true });
          await page.screenshot({
            path: `.cache/reading-screenshots/${width}-${theme}.png`,
          });
        }
      }
    }
    expect(failures).toEqual([]);
  });
}
