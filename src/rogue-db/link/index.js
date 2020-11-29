import {
  unwrap,
  wrapObject,
  unwrapObject,
  mergeObject,
  decodeArgs,
} from '@graffy/common';

export function linkResult(objects, query, linkSpecs) {
  for (const linkProp in linkSpecs) {
    const { target, prop, backProp } = linkSpecs[linkProp];
    if (backProp) {
      const linkedQueries = unwrap(query, prop);
      if (!linkedQueries || !linkedQueries.length) continue;
      const args = linkedQueries.map(decodeArgs);

      for (const object of objects) {
        const links = args.map((arg) => ({
          _key_: arg,
          _ref_: [...target, { ...arg, [backProp]: { $in: object.ids } }],
        }));
        mergeObject(object, wrapObject(links, linkProp));
      }
    } else {
      for (const object of objects) {
        const link = { _ref_: [...target, unwrapObject(object, prop)] };
        mergeObject(object, wrapObject(link, linkProp));
      }
    }
  }
  return objects;
}
