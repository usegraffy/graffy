import {
  unwrap,
  wrapObject,
  unwrapObject,
  mergeObject,
  decodeArgs,
  makePath,
} from '@graffy/common';

export function linkResult(objects, query, linkSpecs) {
  for (let linkProp in linkSpecs) {
    const { target, prop, backProp } = linkSpecs[linkProp];
    linkProp = makePath(linkProp);
    if (backProp) {
      const linkedQueries = unwrap(query, linkProp);
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

export function linkChange(object, linkSpecs) {
  for (let linkProp in linkSpecs) {
    const { target, prop, backProp } = linkSpecs[linkProp];
    if (backProp) continue;
    linkProp = makePath(linkProp);
    const link = unwrapObject(object, linkProp);
    if (link) {
      // Remove the link from the object; we don't write it.
      mergeObject(object, wrapObject(null, linkProp));

      // If the prop of this link is alread present, do nothing more.
      if (unwrapObject(object, prop) !== undefined) continue;

      if (!link._ref_) {
        throw Error(
          `pg_write.missing_ref: ${linkProp.join('.')} ${JSON.stringify(link)}`,
        );
      }

      const ref = makePath(link._ref_);
      if (
        ref.length !== target.length + 1 ||
        target.some((tkey, i) => ref[i] !== tkey)
      ) {
        throw Error(
          `pg_write.incompatible_ref: ${linkProp.join('.')} ${
            link._ref_
          } ${target.join('.')}`,
        );
      }

      const value = ref[ref.length - 1];
      mergeObject(object, wrapObject(value, prop));
    }
  }

  return object;
}
