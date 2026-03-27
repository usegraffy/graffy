import { literal, quoteIdent } from './escape.js';

export function getLookup(prop, options) {
  const [root, ...suffix] = prop.split('.');
  const types = options?.schema?.types || {};
  const type = types[root];
  if (!type) {
    throw Error(`clickhouse.no_column ${root}`);
  }

  const rootExpr = quoteIdent(root);
  if (!suffix.length) {
    return {
      root,
      suffix,
      type,
      isJsonPath: false,
      rootExpr,
      orderExpr: rootExpr,
      textExpr:
        type === 'String' || type === 'Nullable(String)'
          ? `ifNull(${rootExpr}, '')`
          : `toString(${rootExpr})`,
      rawExpr: rootExpr,
      numericExpr: `toFloat64OrZero(${rootExpr})`,
    };
  }

  const pathArgs = suffix.map((seg) => literal(seg)).join(', ');
  const jsonExpr = `ifNull(${rootExpr}, '{}')`;
  const textExpr = `JSONExtractString(${jsonExpr}, ${pathArgs})`;

  return {
    root,
    suffix,
    type,
    isJsonPath: true,
    rootExpr,
    orderExpr: textExpr,
    textExpr,
    rawExpr: `JSONExtractRaw(${jsonExpr}, ${pathArgs})`,
    numericExpr: `toFloat64OrZero(${textExpr})`,
  };
}
