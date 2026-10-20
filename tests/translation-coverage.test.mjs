import test from 'node:test';
import assert from 'node:assert/strict';

test('coverage rejects copied English prose instead of counting it as translated', async () => {
  const { assertTranslationCoverage } =
    await import('../scripts/lib/translations.mjs');
  const units = [{ id: 'one', source: 'The caller owns the memory.' }];
  assert.throws(
    () =>
      assertTranslationCoverage(units, { one: 'The caller owns the memory.' }),
    /Untranslated prose/,
  );
  assert.doesNotThrow(() =>
    assertTranslationCoverage(units, { one: '调用者拥有该内存。' }),
  );
});

test('coverage rejects missing or extraneous translations', async () => {
  const { assertTranslationCoverage } =
    await import('../scripts/lib/translations.mjs');
  const units = [
    { id: 'one', source: 'The allocator must outlive this object.' },
  ];
  assert.throws(
    () => assertTranslationCoverage(units, {}),
    /Missing translation/,
  );
  assert.throws(
    () =>
      assertTranslationCoverage(units, {
        one: '分配器的生命周期必须覆盖此对象。',
        other: '额外内容',
      }),
    /Unknown translation/,
  );
});

test('single-word prose needs translation and technical names need an explicit reviewed reason', async () => {
  const { assertTranslationCoverage } =
    await import('../scripts/lib/translations.mjs');
  const units = [{ id: 'todo', source: 'TODO' }];
  assert.throws(
    () => assertTranslationCoverage(units, { todo: 'TODO' }),
    /Untranslated prose/,
  );
  assert.doesNotThrow(() => assertTranslationCoverage(units, { todo: '待办' }));
  const technical = [{ id: 'name', source: 'POSIX' }];
  assert.throws(
    () => assertTranslationCoverage(technical, { name: 'POSIX' }),
    /Untranslated prose/,
  );
  assert.doesNotThrow(() =>
    assertTranslationCoverage(
      technical,
      { name: 'POSIX' },
      { name: '标准名称，保留正式缩写。' },
    ),
  );
});
