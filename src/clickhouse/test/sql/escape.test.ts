import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isNullableType, isNumericType } from '../../sql/escape.ts';

describe('clickhouse_escape', () => {
  test('isNumericType_accepts_types_toFloat64_can_convert', () => {
    const numeric = [
      'Int8',
      'Int64',
      'Int256',
      'UInt8',
      'UInt64',
      'Float32',
      'Float64',
      'Bool',
      'Date',
      'Date32',
      'DateTime',
      "DateTime('UTC')",
      'DateTime64(3)',
      "DateTime64(3, 'UTC')",
      'Decimal(18, 4)',
      'Decimal64(3)',
      'Decimal128(10)',
      'Nullable(Int64)',
      'LowCardinality(Nullable(Float64))',
    ];
    for (const type of numeric) {
      assert.strictEqual(isNumericType(type), true, type);
    }
  });

  test('isNumericType_rejects_text_and_container_types', () => {
    const other = [
      'String',
      'Nullable(String)',
      'LowCardinality(String)',
      'FixedString(16)',
      "Enum8('a' = 1)",
      'Array(Int64)',
      'Map(String, Int64)',
      'Tuple(Int64, String)',
      'JSON',
      'UUID',
      'IPv4',
      undefined,
    ];
    for (const type of other) {
      assert.strictEqual(isNumericType(type), false, String(type));
    }
  });

  test('isNullableType_sees_through_LowCardinality_only', () => {
    for (const type of [
      'Nullable(Int64)',
      'Nullable(String)',
      'LowCardinality(Nullable(String))',
    ]) {
      assert.strictEqual(isNullableType(type), true, type);
    }
    for (const type of [
      'Int64',
      'String',
      'LowCardinality(String)',
      'Array(Nullable(Int64))',
      'Map(String, Nullable(Int64))',
      undefined,
    ]) {
      assert.strictEqual(isNullableType(type), false, String(type));
    }
  });
});
