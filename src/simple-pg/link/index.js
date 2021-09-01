import {
  add,
  wrap,
  unwrap,
  wrapObject,
  unwrapObject,
  mergeObject,
  decodeArgs,
  encodeArgs,
  splitArgs,
  splitRef,
  encodePath,
  isEmpty,
} from '@graffy/common';
import { format } from '@graffy/testing';
import debug from 'debug';

const log = debug('graffy:pg:link');

function makeRef(template, object) {
  function replacePlaceholders(key) {
    if (typeof key === 'string' && key[0] === '$' && key[1] === '$') {
      return unwrapObject(object, encodePath(key.slice(2)));
    }
    if (Array.isArray(key)) {
      return key.map(replacePlaceholders);
    }
    if (typeof key === 'object' && key) {
      const result = {};
      for (const prop in key) result[prop] = replacePlaceholders(key[prop]);
      return result;
    }
    return key;
  }

  const res = template.map(replacePlaceholders);
  return res;
}

export function linkResult(objects, query, { links: linkSpecs }) {
  const refQueries = [];

  for (let linkProp in linkSpecs) {
    const linkPath = encodePath(linkProp);
    const linkedQuery = unwrap(query, linkPath);
    if (!linkedQuery) continue;

    // console.log({ query, linkProp, linkedQuery });

    for (const object of objects) {
      const ref = makeRef(linkSpecs[linkProp], object);
      const [refRange, refArg] = splitRef(ref);
      if (refRange) {
        const links = [];
        mergeObject(object, wrapObject(links, linkPath));

        const refQuery = linkedQuery.map((queryNode) => {
          const [queryRange, queryArgs] = splitArgs(decodeArgs(queryNode));
          // const node = queryNode.prefix ? queryNode : queryNode.children[0];
          const linkArg = { ...refArg, ...queryArgs };

          links.push({
            $key: isEmpty(queryArgs) ? '' : { ...queryArgs, $all: true },
            $ref: ref.slice(0, -1).concat([{ ...linkArg, $all: true }]),
          });

          return queryRange
            ? {
                ...encodeArgs(linkArg),
                children: [queryNode],
                version: queryNode.version,
                prefix: true,
              }
            : { ...queryNode, ...encodeArgs(linkArg) };
        });

        add(refQueries, wrap(refQuery, encodePath(ref.slice(0, -1))));
      } else {
        mergeObject(object, wrapObject({ $ref: ref }, linkPath));
        add(refQueries, wrap(linkedQuery, encodePath(ref)));
      }
    }
  }

  log('Linked Result', JSON.stringify(objects, null, 2), format(refQueries));

  return refQueries;
}

export function linkChange(object, { links: linkSpecs }) {
  for (let linkProp in linkSpecs) {
    const { target, prop, back } = linkSpecs[linkProp];
    if (back) continue;
    const targetPath = encodePath(target);
    const linkPath = encodePath(linkProp);
    const idPath = encodePath(prop);
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

      const ref = encodePath(link.$ref);
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
