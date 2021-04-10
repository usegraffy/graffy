import sql, { raw, join } from 'sql-template-tag';
import {
  makePath,
  wrapObject,
  unwrapObject,
  mergeObject,
  isEmpty,
} from '@graffy/common';

export function update(object, options) {
  const { idCol, table } = options;
  if (!object[idCol]) {
    throw Error('pg.write_no_id: ' + JSON.stringify(object));
  }

  const row = objectToRow(object, options);

  return sql`
    UPDATE "${raw(table)}" SET ${getUpdateSet(row, options)}
    WHERE "${raw(idCol)}" = ${row[idCol]}`;
}

export function insert(object, options) {
  if (!object[options.idCol]) {
    throw Error('pg.write_no_id: ' + JSON.stringify(object));
  }

  const row = objectToRow(object, options);

  return sql`
    INSERT INTO "${raw(options.table)}" (${getInsertCols(row, options)})
    VALUES (${getInsertVals(row, options)})`;
}

function objectToRow(object, { props, defCol }) {
  const row = {};
  const defVal = defCol ? clean(object, false) : {};

  for (const prop in props) {
    const { data, gin, tsv, trgm } = props[prop];
    const path = makePath(prop);
    const value = unwrapObject(object, path);

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
      case '$rng':
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

function getUpdateSet(row, options) {
  return join(
    Object.entries(row)
      .filter(([name]) => name !== options.idCol)
      .map(([name, value]) => sql`"${raw(name)}" = ${value}`)
      .concat(sql`"${raw(options.verCol)}" = ${Date.now()}`),
    ', ',
  );
}

function getInsertCols(row, options) {
  return join(
    Object.keys(row)
      .map((col) => raw(`"${col}"`))
      .concat(raw(`"${options.verCol}"`)),
    ', ',
  );
}

function getInsertVals(row, _options) {
  return join(Object.values(row).concat(Date.now()), ', ');
}
