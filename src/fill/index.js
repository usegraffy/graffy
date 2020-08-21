import { merge, slice } from '@graffy/common';
import subscribe from './subscribe';
// import { format } from '@graffy/testing';

const MAX_RECURSIONS = 10;

export default function fill(_) {
  return (store) => {
    store.on('read', [], async function fillOnRead(query, options, next) {
      let value = await next(query);
      if (options.skipFill) return value;
      if (!value || !value.length) return null;

      let budget = MAX_RECURSIONS;

      while (budget-- > 1) {
        const { known, unknown } = slice(value, query);
        value = known;
        if (!unknown) break;
        // console.log(unknown[0]);
        const res = await store.call('read', unknown, { skipFill: true });
        // console.log('this', value, res);
        merge(value, res);
      }

      if (!budget) throw new Error('fill.max_recursion');
      // console.log('Read', debug(query), 'returned', debug(value));
      return value;
    });

    store.on('watch', [], function fillOnWatch(query, options, next) {
      if (options.skipFill) return next(query);
      return subscribe(store, query, options);
    });
  };
}
