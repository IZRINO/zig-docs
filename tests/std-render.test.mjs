import test from 'node:test';
import assert from 'node:assert/strict';

let runtimePromise;
const fixtures = new WeakMap();
async function officialRuntime() {
  const { loadRuntime } = await import('../scripts/lib/std-runtime.mjs');
  return (runtimePromise ??= loadRuntime());
}

async function symbolFixture(runtime) {
  if (fixtures.has(runtime)) return fixtures.get(runtime);
  const { pageId, symbolTargets } =
    await import('../scripts/lib/std-render.mjs');
  const pages = new Map(
    [...runtime.roots.keys()].map((path) => [path, pageId(path)]),
  );
  const anchors = new Map(
    [...runtime.declarations.keys()].map((id) => [id, `declaration-${id}`]),
  );
  const fixture = {
    pages,
    anchors,
    targets: symbolTargets(runtime, pages, anchors),
  };
  fixtures.set(runtime, fixture);
  return fixture;
}

test('rewrite links resolves symbols and records upstream missing targets', async () => {
  const { rewriteLinks } = await import('../scripts/lib/std-render.mjs');
  const issues = new Set();
  const map = new Map([['std.Io.Writer', 'std/Io/Writer']]);
  const html = rewriteLinks(
    '<p><a href="#std.Io.Writer">Writer</a><a href="#std.root">root</a></p>',
    map,
    new Map(),
    'en',
    issues,
  );
  assert.match(html, /\/zig-docs\/en\/std\/Io\/Writer\/#std.Io.Writer/);
  assert.match(
    html,
    /https:\/\/ziglang.org\/documentation\/0.17.0\/std\/#std.root/,
  );
  assert.deepEqual([...issues], ['std.root']);
});

test('module paths keep the root namespace at the standard library entry', async () => {
  const { pageId } = await import('../scripts/lib/std-render.mjs');
  assert.equal(pageId('std/std.zig'), 'std');
  assert.equal(pageId('std/Io/Writer.zig'), 'std/Io/Writer');
});

test('same-name declarations receive distinct stable anchors without losing records', async () => {
  const { declarationAnchors } = await import('../scripts/lib/std-render.mjs');
  const entries = [
    { id: 4, fqn: 'std.example.foo', sourceLine: 17 },
    { id: 8, fqn: 'std.example.foo', sourceLine: 32 },
    { id: 9, fqn: 'std.example.bar', sourceLine: 41 },
  ];
  assert.deepEqual(
    [...declarationAnchors(entries)],
    [
      [4, 'std.example.foo'],
      [8, 'std.example.foo--L32'],
      [9, 'std.example.bar'],
    ],
  );
});

test('official exported aliases resolve to the function rather than a same-name source module', async () => {
  const { pageId } = await import('../scripts/lib/std-render.mjs');
  const runtime = await officialRuntime();
  const { anchors, targets } = await symbolFixture(runtime);
  for (const name of ['std.math.log1p', 'std.math.complex.abs']) {
    const sourcePath = `${name.replaceAll('.', '/')}.zig`;
    const functionName = name.split('.').at(-1);
    const declaration = [...runtime.declarations.values()].find(
      (entry) =>
        entry.sourcePath === sourcePath &&
        entry.name === functionName &&
        entry.category === 3,
    );
    assert.ok(declaration, `Missing fixture function: ${name}`);
    assert.notEqual(declaration.id, runtime.roots.get(sourcePath));
    assert.deepEqual(targets.get(name), {
      page: pageId(sourcePath),
      anchor: anchors.get(declaration.id),
    });
  }
});

test('traversal includes private declarations and members of conditional types and constants', async () => {
  const runtime = await officialRuntime();
  assert.equal(runtime.declarations.size, 37803);
  for (const name of [
    'std.Build.AvailableDeps',
    'std.Build.AvailableOption',
    'std.Build.Cache.DepTokenizer.State',
    'std.Io.File.Permissions.executable_file',
    'std.Io.Operation.DeviceIoControl.Result',
    'std.c.AF.ALG',
  ]) {
    const id = runtime.findDeclaration(name);
    assert.notEqual(id, null, `Official lookup failed: ${name}`);
    assert.ok(runtime.declarations.has(id), `Uncollected declaration: ${name}`);
  }
});

test('conditional members render in the API index and Chinese category labels are localized', async () => {
  const { renderDeclaration } = await import('../scripts/lib/std-render.mjs');
  const runtime = await officialRuntime();
  const { anchors } = await symbolFixture(runtime);
  const declaration = runtime.declarations.get(
    runtime.findDeclaration('std.Io.File.Permissions'),
  );
  const html = renderDeclaration(
    runtime,
    declaration,
    runtime.roots.get(declaration.sourcePath),
    'zh-cn',
    anchors,
  );
  assert.match(html, /class="api-kind">常量</);
  assert.match(html, /class="api-members"/);
  assert.match(html, /<code>executable_file<\/code>/);
  assert.match(html, /<code>toMode<\/code>/);
});

test('alternative namespace paths resolve locally while genuinely missing upstream symbols remain recorded', async () => {
  const { rewriteLinks } = await import('../scripts/lib/std-render.mjs');
  const runtime = await officialRuntime();
  const { anchors, targets } = await symbolFixture(runtime);
  const alternate = 'std.Io.Dir.path.basename';
  const missing = 'std.Target.nvptx.Feature.sm_101';
  assert.equal(targets.has(alternate), false);
  const issues = new Set();
  const html = rewriteLinks(
    `<a href="#${alternate}">basename</a><a href="#${missing}">missing</a>`,
    targets,
    new Map(),
    'en',
    issues,
  );
  const id = runtime.findDeclaration(alternate);
  assert.ok(html.includes(`/zig-docs/en/std/fs/path/#${anchors.get(id)}`));
  assert.deepEqual([...issues], [missing]);
});

test('an officially resolvable but uncollected declaration fails instead of being reported as an upstream broken reference', async () => {
  const { symbolHref } = await import('../scripts/lib/std-runtime.mjs');
  const { symbolTargets } = await import('../scripts/lib/std-render.mjs');
  const runtime = await officialRuntime();
  const { pages, anchors } = await symbolFixture(runtime);
  const incomplete = {
    ...runtime,
    declarations: new Map(runtime.declarations),
  };
  const name = 'std.Build.AvailableDeps';
  incomplete.declarations.delete(runtime.findDeclaration(name));
  assert.throws(() => {
    const targets = symbolTargets(incomplete, pages, anchors);
    symbolHref(name, targets, 'en');
  }, /Officially resolvable symbol was not collected/);
});

test('official source highlighting restores only a missing final newline', async () => {
  const { exactSourceHtml } = await import('../scripts/lib/std-render.mjs');
  assert.equal(
    exactSourceHtml('<b>pub</b> const x = 1;', 'pub const x = 1;\n'),
    '<b>pub</b> const x = 1;\n',
  );
  assert.equal(exactSourceHtml('const x = 1;', 'const x = 1;'), 'const x = 1;');
  assert.equal(
    exactSourceHtml(
      '<b>const</b> x = 1;',
      '// Copyright example\n\nconst x = 1;\n',
    ),
    '<span class="tok-comment">// Copyright example\n\n</span><b>const</b> x = 1;\n',
  );
  assert.throws(
    () => exactSourceHtml('const x = 2;', 'const x = 1;\n'),
    /Source highlighting changes/,
  );
});
