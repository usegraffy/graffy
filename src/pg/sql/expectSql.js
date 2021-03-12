export default function expectSql(actual, expected) {
  const normalSql = (str) => str.toString('$').trim().replace(/\s+/g, ' ');

  expect(normalSql(actual.text)).toEqual(normalSql(expected.text));
  expect(actual.values).toEqual(expected.values);
}
