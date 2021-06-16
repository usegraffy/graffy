import sql, { raw, join } from 'sql-template-tag';
import {
  encodePath,
  wrapObject,
  unwrapObject,
  mergeObject,
  isEmpty,
  isPlainObject,
} from '@graffy/common';
import getArgSql from './getArgSql.js';
import getIdMeta from './getIdMeta.js';
import getSelectCols from './getSelectCols.js';

export function patch(object, arg, options) {
  const { table, idCol } = options;
  const { where, attrs } = isPlainObject(arg)
    ? getArgSql(arg, options)
    : { where: [sql`"${raw(idCol)}" = ${arg}`], attrs: getIdMeta(options) };
  if (!where || !where.length) throw Error('pg_write.no_condition');

  const row = objectToRow(object, options);

  return sql`
    UPDATE "${raw(table)}" SET ${getUpdates(row, options)}
    WHERE ${join(where, ` AND `)}
    RETURNING (${getSelectCols(options)} || ${attrs})`;
}

export function put(object, arg, options) {
  const { idCol, table, props } = options;
  const row = objectToRow(object, options);

  let meta, conflictTarget;
  if (isPlainObject(arg)) {
    const { attrs } = getArgSql(arg);
    meta = attrs;
    conflictTarget = join(
      Object.keys(arg).map((prop) => {
        const col = props[prop]?.data;
        if (!col) throw Error('pg_write.bad_put_prop:' + prop);
        return sql`"${raw(col)}"`;
      }),
    );
  } else {
    meta = getIdMeta(options);
    conflictTarget = sql`"${raw(idCol)}"`;
  }
  return sql`
    INSERT INTO "${raw(table)}" (${getCols(row, options)})
    VALUES (${getVals(row, options)})
    ON CONFLICT (${conflictTarget}) DO UPDATE SET
    (${getCols(row, options)}) = (${getVals(row, options)})
    RETURNING (${getSelectCols(options)} || ${meta})`;
}

function objectToRow(object, { props, defCol }) {
  const row = {};
  const defVal = defCol ? clean(object, false) : {};

  for (const prop in props) {
    const { data, gin, tsv, trgm } = props[prop];
    const path = encodePath(prop);
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
      .map(([name, value]) => {
        const updater = options.updaters[name];
        return sql`"${raw(name)}" = ${
          updater === '||'
            ? sql`"${raw(name)}" || ${value}`
            : updater
            ? sql`${raw(updater)}("${raw(name)}", ${value})`
            : value
        }`;
      })
      .concat(sql`"${raw(options.verCol)}" = now()`),
    ', ',
  );
}
