import { merge, slice } from '@graffy/common';
import subscribe from './subscribe';

const MAX_RECURSIONS = 10;

export default function fill(store) {
  if (!store) return fill; // This is for people who .use(fill())

  store.on('get', [], async function fillOnGet(query, options, next) {
    let value = await next(query);
    if (options.skipFill) return value;

    let budget = MAX_RECURSIONS;

    while (budget-- > 0) {
      const { known, unknown } = slice(value, query);
      value = known;
      if (!unknown) break;
      const res = await store.call('get', unknown, { skipFill: true });
      merge(value, res);
    }

    if (!budget) throw new Error('fill.max_recursion');
    return value;
  });

  store.on('sub', [], function fillOnSub(query, options, next) {
    if (options.skipFill) return next(query);
    return subscribe(store, query, options.raw);
  });
}
