import { isEncodedKey, decodeKey, keyStep } from '@graffy/common';
import { peel, normalizePath } from '../common.js';
import sql from 'sqlate';

let refCounter = 0;
const makeRef = () => {
  const ref = `r${refCounter++}`;
  if (refCounter > 1e6) refCounter = 0;
  return (col, path) => {
    let q = sql.table(ref);
    if (col) q = sql`${q}.${sql.column(col)}`;
    if (path && path.length)
      q = sql`${q} #>> ${'{' + normalizePath(path).join(',') + '}'}`;
    return q;
  };
};

const concatSql = (frags, delim) =>
  frags.length
    ? frags.reduce((pre, frag) => (pre ? sql`${pre}${delim}${frag}` : frag))
    : sql``;

const getLookupSql = (ref, name) =>
  ['id', 'createtime', 'updatetime', 'isDeleted'].includes(name)
    ? ref(name)
    : ref('tags', [name]);

const getCollectionSql = (name) =>
  sql`(SELECT * FROM "object" WHERE "type" = ${name})`;

/*
  Converts a small subset of Mongo-style params to an SQL where clause.
*/
function getFilterSql(ref, params) {
  return Object.keys(params).map((name) => {
    const value = params[name];
    const lhs = getLookupSql(ref, name);
    if (typeof value !== 'object') return sql`${lhs} = ${value}`;
    if (value === null) return sql`${lhs} IS NULL`;

    return concatSql(
      Object.keys(value).map((operator) => {
        const rhs = value[operator];
        switch (operator) {
          case '$eq':
            return sql`${lhs} = ${rhs}`;
          case '$ne':
            return sql`${lhs} <> ${rhs}`;
          case '$lt':
            return sql`${lhs} < ${rhs}`;
          case '$lte':
            return sql`${lhs} <= ${rhs}`;
          case '$gt':
            return sql`${lhs} > ${rhs}`;
          case '$gte':
            return sql`${lhs} >= ${rhs}`;
          case '$in':
            return sql`${lhs} IN ${rhs}`;
          case '$nin':
            return sql`${lhs} NOT IN ${rhs}`;
        }
      }),
      sql` AND `,
    );
  });
}

function getBoundSql(ref, order, bound, kind) {
  if (!Array.isArray(bound)) {
    throw Error('bad_query bound:' + JSON.stringify(bound));
  }

  const lhs = getLookupSql(ref, order[0]);
  const rhs = bound[0];
  if (order.length > 1 && bound.length > 1) {
    const subCond = getBoundSql(ref, order.slice(1), bound.slice(1), kind);
    switch (kind) {
      case 'after':
      case 'since':
        return sql`${lhs} > ${rhs} OR ${lhs} = ${rhs} AND (${subCond})`;
      case 'before':
      case 'until':
        return sql`${lhs} < ${rhs} OR ${lhs} = ${rhs} AND (${subCond})`;
    }
  } else {
    switch (kind) {
      case 'after':
        return sql`${lhs} > ${rhs}`;
      case 'since':
        return sql`${lhs} >= ${rhs}`;
      case 'before':
        return sql`${lhs} < ${rhs}`;
      case 'until':
        return sql`${lhs} <= ${rhs}`;
    }
  }
}

function getParamSql(ref, key, end) {
  if (!isEncodedKey(key) && !end) {
    return { where: [sql`${ref('id')} = ${key}`] };
  }

  const keyParts = key.split('.');
  const endParts = end.split('.');
  let orderBy = ['createtime', 'id'];
  let whereClauses = [];
  let keyPrefix;
  let reverse;

  if (keyParts.length === 2) {
    if (endParts.length !== 2 || endParts[0] !== keyParts[0]) {
      throw Error('bad_query key:' + key + ' end:' + end);
    }
    keyPrefix = keyParts[0].substr(1); // Remove leading \0000

    const { order, ...filter } = decodeKey(keyParts[0]);
    if (order) orderBy = order;
    whereClauses.push(...getFilterSql(ref, filter));

    key = keyParts[1];
    end = endParts[1];
    if (key > end) {
      reverse = true;
      [key, end] = [end, key];
    }
  }

  // console.log({ key, end, reverse, whereClauses });

  if (key !== '') {
    const { key: k, step } = keyStep(key);
    whereClauses.push(
      getBoundSql(ref, orderBy, decodeKey(k), step === 1 ? 'after' : 'since'),
    );
  }

  if (end !== '\uffff') {
    const { key: k, step } = keyStep(end);
    whereClauses.push(
      getBoundSql(ref, orderBy, decodeKey(k), step === -1 ? 'before' : 'until'),
    );
  }

  return {
    keyPrefix,
    where: whereClauses,
    reverse,
    order: orderBy,
  };
}

function getSelectSql(collections, prefix, query, isLink) {
  const { name, links } = collections[prefix];
  const ref = makeRef();

  // If this is a join?
  let { where, order, limit: _limit, keyPrefix, reverse } = isLink
    ? {}
    : getParamSql(ref, query.key, query.end);

  const cols = [
    sql`${prefix} "_prefix_"`,
    ref('id'),
    ref('name'),
    ref('links'),
    ref('tags'),
    ref('data'),
    ref('createtime'),
    ref('updatetime'),
  ];
  const joins = [];

  if (keyPrefix) cols.unshift(sql`${keyPrefix} "_key_prefix_"`);
  if (order) {
    cols.unshift(
      sql`jsonb_build_array(${sql.csv(
        order.map((name) => getLookupSql(ref, name)),
      )}) "_key_"`,
    );
  }

  for (const link of links) {
    const [prop, tPrefix, back] = link;
    const subQuery = peel(query, prop);
    if (!subQuery) continue;

    const subSql = back
      ? concatSql(
          subQuery.map((objQuery) =>
            getSelectSql(collections, tPrefix, objQuery, false),
          ),
          sql`\nUNION\n`,
        )
      : getSelectSql(collections, tPrefix, subQuery, true);
    const subRef = makeRef();

    const on = back
      ? sql`${ref('id')} = ${subRef('links', back)}`
      : sql`${ref('links', prop)} = ${subRef('id')}`;

    cols.push(sql`json_agg(${subRef()}.*) ${sql.column(prop)}`);
    joins.push({ subRef, subSql, on });
  }

  const joinClause = concatSql(
    joins.map(
      ({ subRef, subSql, on }) =>
        sql`LEFT JOIN LATERAL (${subSql}) ${subRef()} ON ${on}`,
    ),
    sql`\n`,
  );

  return sql`
  SELECT
    ${sql.csv(cols)}
  FROM
    ${getCollectionSql(name)} ${ref()} ${joinClause} ${
    where && where.length
      ? sql`
  WHERE
    ${concatSql(where, sql` AND `)}`
      : sql``
  } ${
    joins.length
      ? sql`
  GROUP BY
    ${ref('id')}, ${ref('name')}, ${ref('links')}, ${ref('tags')}, ${ref(
          'data',
        )},
    ${ref('createtime')}, ${ref('updatetime')}`
      : sql``
  } ${
    order
      ? sql`
  ORDER BY
    ${sql.csv(
      order.map(
        (name) =>
          sql`${getLookupSql(ref, name)} ${reverse ? sql`DESC` : sql`ASC`}`,
      ),
    )}`
      : sql``
  } ${
    query.count
      ? sql`
  LIMIT
    ${query.count}`
      : sql``
  }
  `;
}

export default function getSelects(query, collections) {
  const selects = [];

  for (const prefix in collections) {
    const collectionQuery = peel(query, prefix);
    if (!collectionQuery) continue;
    for (const objectQuery of collectionQuery) {
      selects.push(getSelectSql(collections, prefix, objectQuery));
    }
  }

  selects.forEach((select) => {
    console.log(select.toString('$')), console.log(select.parameters);
  });
  return selects;
}
