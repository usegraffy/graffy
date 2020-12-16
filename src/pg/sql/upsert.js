import sql from 'sqlate';
import { concatSql } from './util.js';
import {
  empty,
  makePath,
  wrapObject,
  unwrapObject,
  cloneObject,
  mergeObject,
} from '@graffy/common';

export function update(object, options) {
  if (!object[options.idCol]) {
    throw Error('pg.write_no_id: ' + JSON.stringify(object));
  }

  return sql`
    UPDATE  ${sql.table(options.table)} SET ${getUpdateSet(object, options)}
    WHERE "id" = ${object.id}`;
}

export function insert(object, options) {
  if (!object[options.idCol]) {
    throw Error('pg.write_no_id: ' + JSON.stringify(object));
  }

  return sql`
    INSERT INTO ${sql.table(options.table)} (${getInsertCols(options)})
    VALUES ${getInsertVals(object, options)}`;
}

function getUpdateSet(object, { props, defCol }) {
  const defVal = defCol ? cloneObject(object) : {};
  const ginVal = {};
  const tsvVal = {};
  const trgmVal = {};

  const sqls = [];

  for (const prop in props) {
    const { data, gin, tsv, trgm } = props[prop];
    const path = makePath(prop);
    const value = unwrapObject(object, path);

    if (data) {
      sqls.push(sql`${sql.column(data)}=${value}`);
      // Delete this path from the default object
      if (defCol) mergeObject(defVal, wrapObject(null, path));
    }

    if (gin) {
      for (const col of gin) {
        ginVal[col] = ginVal[col] || {};
        ginVal[col][prop] = value;
      }
    }

    if (tsv) {
      for (const col of tsv) {
        tsvVal[col] = tsvVal[col] || [];
        tsvVal[col].push(value);
      }
    }

    if (trgm) {
      for (const col of trgm) {
        trgmVal[col] = trgmVal[col] || [];
        trgmVal[col].push(value);
      }
    }
  }

  if (!empty(defVal)) {
    sqls.push(sql`${sql.column(defCol)} = ${defVal}`);
  }

  if (!empty(ginVal)) {
    for (const col in ginVal) {
      sqls.push(sql`${sql.column(col)} = ${ginVal[col]}`);
    }
  }

  return sql.csv(sqls);
}

function getInsertCols(options) {
  return concatSql(Object.keys(options.columns).map((col) => sql.column(col)));
}

function getInsertVals(object, options) {
  return sql.tuple(values);
}
