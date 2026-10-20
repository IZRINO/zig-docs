import test from 'node:test';
import assert from 'node:assert/strict';

test('cross-reference links resolve between the reference and the library, preserving unknown upstream references', async () => {
  const { rewriteDocumentationLinks } =
    await import('../scripts/lib/links.mjs');
  const owners = new Map([
    ['Undefined-Behavior', 'reference/Undefined-Behavior'],
  ]);
  const symbols = new Map([['std.Io.Writer', 'std/Io/Writer']]);
  const issues = new Set();
  const html = rewriteDocumentationLinks(
    '<a href="https://ziglang.org/documentation/0.17.0/#Undefined-Behavior">UB</a><a href="std/#std.Io.Writer">Writer</a><a href="https://ziglang.org/documentation/0.17.0/#unknown">unknown</a>',
    'https://ziglang.org/documentation/0.17.0/',
    'zh-cn',
    owners,
    symbols,
    issues,
  );
  assert.match(
    html,
    /\/zig-docs\/zh-cn\/reference\/Undefined-Behavior\/#Undefined-Behavior/,
  );
  assert.match(html, /\/zig-docs\/zh-cn\/std\/Io\/Writer\/#std.Io.Writer/);
  assert.match(
    html,
    /href="https:\/\/ziglang.org\/documentation\/0.17.0\/#unknown"/,
  );
  assert.equal(issues.size, 1);
});

test('cross-reference links preserve the resolved anchor of an exported function alias', async () => {
  const { rewriteDocumentationLinks } =
    await import('../scripts/lib/links.mjs');
  const issues = new Set();
  const html = rewriteDocumentationLinks(
    '<a href="std/#std.math.log1p">log1p</a>',
    'https://ziglang.org/documentation/0.17.0/',
    'en',
    new Map(),
    new Map([
      [
        'std.math.log1p',
        { page: 'std/math/log1p', anchor: 'std.math.log1p.log1p' },
      ],
    ]),
    issues,
  );
  assert.match(html, /\/en\/std\/math\/log1p\/#std.math.log1p.log1p/);
  assert.equal(issues.size, 0);
});
