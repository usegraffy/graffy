import sql, { raw, join } from 'sql-template-tag';
import {
  makePath,
  wrapObject,
  unwrapObject,
  mergeObject,
  isEmpty,
} from '@graffy/common';
import { getSelectCols, getArgSql } from './select.js';

export function patch(object, condition, options) {
  const { table } = options;
  const { where } = getArgSql(condition, options);
  if (!where || !where.length) throw Error('pg_write.no_condition');

  const row = objectToRow(object, options);

  return sql`
    UPDATE "${raw(table)}" SET ${getUpdates(row, options)}
    WHERE ${join(where, ` AND `)}
    RETURNING (${getSelectCols(options)})`;
}

export function put(object, options) {
  const { idCol, table } = options;
  const row = objectToRow(object, options);

  return sql`
    INSERT INTO "${raw(table)}" (${getCols(row, options)})
    VALUES (${getVals(row, options)})
    ON CONFLICT ("${raw(idCol)}") DO UPDATE SET
    (${getCols(row, options)}) = (${getVals(row, options)})
    RETURNING (${getSelectCols(options)})`;
}

function objectToRow(object, { props, defCol }) {
  const row = {};
  const defVal = defCol ? clean(object, false) : {};

  for (const prop in props) {
    const { data, gin, tsv, trgm } = props[prop];
    const path = makePath(prop);
    const value = unwrapObject(object, path);

    if (typeof value === 'undefined') continue;

    if (data) {
      row[data] = clean(value, false);
      // Delete this path from the default object
      if (defCol) mergeObject(defVal, wrapObject(null, path));
    }

    if (gin) {
      for (const col of gin) {
        row[col] = row[col] || {};
        row[col][prop] = clean(value, true);
      }
    }

    if (tsv) {
      for (const col of tsv) {
        row[col] = row[col] || [];
        row[col].push(value);
      }
    }

    if (trgm) {
      for (const col of trgm) {
        row[col] = row[col] || [];
        row[col].push(value);
      }
    }
  }

  if (defCol) row[defCol] = defVal;

  return row;
}

function clean(object, forLookup) {
  if (typeof object !== 'object' || !object) {
    return object;
  }

  const clone = {};

  for (const prop in object) {
    switch (prop) {
      case '$key':
      case '$put':
      case '$ref':
        continue;
      case '$val':
        if (forLookup) return object[prop];
        clone[prop] = object[prop];
        continue;
    }
    const value = clean(object[prop]);
    if (value === null) continue;
    clone[prop] = value;
  }

  return isEmpty(clone) ? null : clone;
}

function getCols(row, options) {
  return join(
    Object.keys(row)
      .map((col) => raw(`"${col}"`))
      .concat(raw(`"${options.verCol}"`)),
    ', ',
  );
}

function getVals(row, _options) {
  return join(Object.values(row).concat(Date.now()), ', ');
}

function getUpdates(row, options) {
  return join(
    Object.entries(row)
      .filter(([name]) => name !== options.idCol)
      .map(([name, value]) => sql`"${raw(name)}" = ${value}`)
      .concat(sql`"${raw(options.verCol)}" = ${Date.now()}`),
    ', ',
  );
}
