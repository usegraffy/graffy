export function quoteIdent(name) {
  const ident = String(name).replace(/`/g, '``');
  return `\`${ident}\``;
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
  return type === 'UInt8' || type === 'Nullable(UInt8)';
}

export function isStringishType(type) {
  return type === 'String' || type === 'Nullable(String)';
}
