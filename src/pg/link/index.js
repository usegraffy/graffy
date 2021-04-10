import {
  unwrap,
  wrapObject,
  unwrapObject,
  mergeObject,
  decodeArgs,
  makePath,
} from '@graffy/common';

export function linkResult(objects, query, { links: linkSpecs, idProp }) {
  for (let linkProp in linkSpecs) {
    const { target, prop, back } = linkSpecs[linkProp];
    const targetPath = makePath(target);
    const linkPath = makePath(linkProp);

    if (back) {
      const linkedQueries = unwrap(query, linkPath);
      if (!linkedQueries || !linkedQueries.length) continue;
      const args = linkedQueries.map(decodeArgs);

      for (const object of objects) {
        const links = args.map((arg) => ({
          $key: arg,
          $ref: [...targetPath, { ...arg, [back]: object[idProp] }],
        }));
        mergeObject(object, wrapObject(links, linkPath));
      }
    } else {
      const idPath = makePath(prop);
      for (const object of objects) {
        const link = { $ref: [...targetPath, unwrapObject(object, idPath)] };
        mergeObject(object, wrapObject(link, linkPath));
      }
    }
  }
  return objects;
}

export function linkChange(object, { links: linkSpecs }) {
  for (let linkProp in linkSpecs) {
    const { target, prop, back } = linkSpecs[linkProp];
    if (back) continue;
    const targetPath = makePath(target);
    const linkPath = makePath(linkProp);
    const idPath = makePath(prop);
    const link = unwrapObject(object, linkPath);
    if (link) {
      // Remove the link from the object; we don't write it.
      mergeObject(object, wrapObject(null, linkPath));

      // If the prop of this link is alread present, do nothing more.
      if (unwrapObject(object, idPath) !== undefined) continue;

      if (!link.$ref) {
        throw Error(
          `pg_write.missing_ref: ${linkPath.join('.')} ${JSON.stringify(link)}`,
        );
      }

      const ref = makePath(link.$ref);
      if (
        ref.length !== targetPath.length + 1 ||
        targetPath.some((tkey, i) => ref[i] !== tkey)
      ) {
        throw Error(
          `pg_write.incompatible_ref: ${linkPath.join('.')} ${
            link.$ref
          } ${targetPath.join('.')}`,
        );
      }

      const value = ref[ref.length - 1];
      mergeObject(object, wrapObject(value, idPath));
    }
  }

  return object;
}
