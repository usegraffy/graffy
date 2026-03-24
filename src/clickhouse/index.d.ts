import type Graffy from '@graffy/core';

export type ClickhouseJoinOptions = {
  table?: string;
  idCol?: string;
  verCol?: string;
  schema?: unknown;
  database?: string;
  final?: boolean;
  refCol?: string;
  joins?: Record<string, ClickhouseJoinOptions>;
};

export type ClickhouseOptions = {
  table?: string;
  idCol?: string;
  verCol?: string;
  schema?: unknown;
  database?: string;
  final?: boolean;
  joins?: Record<string, ClickhouseJoinOptions>;
  connection?: unknown;
};

export type ClickhouseProvider = (store: Graffy) => void;

export declare const clickhouse: (
  options?: ClickhouseOptions,
) => ClickhouseProvider;

export declare const ch: typeof clickhouse;
