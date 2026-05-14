export function quoteIdent(name) {
  const ident = String(name).replace(/`/g, '``');
  return `\`${ident}\``;
}

export function unwrapType(type) {
  let current = type;

  while (typeof current === 'string') {
    if (current.startsWith('Nullable(') && current.endsWith(')')) {
      current = current.slice('Nullable('.length, -1);
      continue;
    }
    if (current.startsWith('LowCardinality(') && current.endsWith(')')) {
      current = current.slice('LowCardinality('.length, -1);
      continue;
    }
    break;
  }

  return current;
}

export function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw Error('clickhouse.invalid_number');
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) {
    return `(${value.map((item) => literal(item)).join(', ')})`;
  }
  if (typeof value === 'object') {
    return literal(JSON.stringify(value));
  }

  // ClickHouse supports backslash and quote escaping in string literals.
  const escaped = String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${escaped}'`;
}

export function isPlainObject(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.constructor === Object
  );
}

export function isUInt8Type(type) {
  return unwrapType(type) === 'UInt8';
}

export function isStringishType(type) {
  const unwrapped = unwrapType(type);
  return (
    unwrapped === 'String' ||
    /^FixedString\(\d+\)$/.test(unwrapped || '') ||
    /^Enum(?:8|16)\(/.test(unwrapped || '')
  );
}
