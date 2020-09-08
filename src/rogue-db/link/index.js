import {
  unwrap,
  wrapObject,
  unwrapObject,
  mergeObject,
  decodeArgs,
} from '@graffy/common';

export function linkResult(objects, query, linkSpecs) {
  for (const { prop, target, back } of linkSpecs) {
    if (back) {
      const linkedQueries = unwrap(query, prop);
      if (!linkedQueries || !linkedQueries.length) continue;
      const args = linkedQueries.map(decodeArgs);

      for (const object of objects) {
        const links = args.map((arg) => ({
          _key_: arg,
          _ref_: [...target, { ...arg, [back]: { $in: object.ids } }],
        }));
        mergeObject(object, wrapObject(links, prop));
      }
    } else {
      for (const object of objects) {
        const link = { _ref_: [...target, unwrapObject(object, prop)] };
        mergeObject(object, wrapObject(link, prop));
      }
    }
  }
  return objects;
}
