import { isStringishType, literal, quoteIdent, unwrapType } from './escape.ts';

function splitTopLevelArgs(value) {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (ch === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(value.slice(start).trim());
  return parts;
}

function getMapTypes(type) {
  const unwrapped = unwrapType(type);
  if (!unwrapped?.startsWith('Map(') || !unwrapped.endsWith(')')) return null;
  const inner = unwrapped.slice('Map('.length, -1);
  const [keyType, valueType] = splitTopLevelArgs(inner);
  return keyType && valueType ? { keyType, valueType } : null;
}

export function getLookup(prop, options) {
  const [root, ...suffix] = prop.split('.');
  const types = options?.schema?.types || {};
  const type = types[root];
  if (!type) {
    throw Error(`clickhouse.no_column ${root}`);
  }

  const rootExpr = quoteIdent(root);
  const mapTypes = getMapTypes(type);
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

  if (mapTypes) {
    if (suffix.length !== 1) {
      throw Error(`clickhouse.map_deep_lookup_unsupported ${prop}`);
    }

    const keyExpr = literal(suffix[0]);
    const rawExpr = `if(mapContains(${rootExpr}, ${keyExpr}), ${rootExpr}[${keyExpr}], NULL)`;

    return {
      root,
      suffix,
      type: mapTypes.valueType,
      isJsonPath: false,
      isMapPath: true,
      rootExpr,
      orderExpr: rawExpr,
      textExpr: isStringishType(mapTypes.valueType)
        ? `ifNull(${rawExpr}, '')`
        : `toString(${rawExpr})`,
      rawExpr,
      numericExpr: `toFloat64OrZero(${rawExpr})`,
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
