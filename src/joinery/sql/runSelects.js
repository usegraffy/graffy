import pg from 'pg';
import { g } from '../build.js';
import { encodeKey, decodeKey } from '@graffy/common';

function buildResult(rows) {
  return rows.flatMap(
    ({
      _key_,
      _prefix_,
      _key_prefix_,
      id,
      name,
      links,
      tags,
      data,
      createtime,
      updatetime,
      ...joins
    }) => {
      const key = _key_
        ? (_key_prefix_ ? `\0${_key_prefix_}.` : '') + encodeKey(_key_)
        : id;

      return [
        g[_prefix_](
          g[key](
            g.id(id),
            g.name(name),
            g.createtime(createtime),
            g.updatetime(updatetime),
            ...Object.keys(joins).map((prop) => {
              // TODO, get this from the config object instead.
              const dPrefix = joins[prop][0]?._prefix_ + '.';
              const backProp = 'todo_backprop';

              if (links[prop]) {
                return g[prop]('-> ' + dPrefix + joins[prop][0].id);
              }

              const keyLinks = joins[prop].reduce((map, obj) => {
                const keyPrefix = '\0' + obj._key_prefix_;
                if (map[keyPrefix]) {
                  obj._key_prefix_ = map[keyPrefix];
                  return map;
                }
                map[keyPrefix] = encodeKey({
                  ...decodeKey(keyPrefix),
                  [backProp]: id,
                });
                return map;
              }, {});

              return g[prop](
                ...Object.keys(keyLinks)((key) =>
                  g[key]('-> ' + keyLinks[key]),
                ),
              );
            }),
          ),
        ),
        ...Object.keys(joins).flatMap((prop) => buildResult(joins[prop])),
      ];
    },
  );
}

export default async function runSelects(query, selects) {
  const pool = new pg.Pool();

  const res = await Promise.all(selects.map((select) => pool.query(select)));
  console.log(
    'Rows',
    JSON.stringify(
      res.map(({ rows }) => rows),
      null,
      2,
    ),
  );
  const combined = g.root(
    ...res.flatMap(({ rows }) => buildResult(rows, query)),
  );

  pool.end();
  console.log(combined);
  return combined;
}
