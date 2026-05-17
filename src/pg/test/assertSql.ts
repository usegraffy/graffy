import assert from 'node:assert/strict';

export default function expectSql(actual, expected) {
  const normalSql = (str) =>
    str
      .toString('$')
      .trim()
      .replace(/([(),])/g, (_, m) => ` ${m} `)
      .replace(/\s+/g, ' ');

  assert.strictEqual(normalSql(actual.text), normalSql(expected.text));
  assert.deepStrictEqual(actual.values, expected.values);
}
