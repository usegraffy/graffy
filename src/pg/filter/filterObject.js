import { unwrapObject, encodePath } from '@graffy/common';
import getAst from './getAst.js';

export default function filterObject(filter, object) {
  function lookup(path) {
    return unwrapObject(object, encodePath(path));
  }

  function checkNode(ast) {
    switch (ast[0]) {
      case '$eq':
        return lookup(ast[1]) === ast[2];
      case '$ne':
        return lookup(ast[1]) !== ast[2];
      case '$lt':
        return lookup(ast[1]) < ast[2];
      case '$lte':
        return lookup(ast[1]) <= ast[2];
      case '$gt':
        return lookup(ast[1]) > ast[2];
      case '$gte':
        return lookup(ast[1]) >= ast[2];
      case '$in':
        return Array.isArray(ast[2]) && ast[2].includes(lookup(ast[1]));
      case '$nin':
        return !Array.isArray(ast[2]) || !ast[2].includes(lookup(ast[1]));
      case '$cts':
      case '$ctd':
      case '$ovp':
      case '$and':
      case '$or':
      case '$not':
      case '$any':
      case '$all':
      case '$has':
        throw Error('pgfilter.unimplemented');
    }
  }

  const rootAst = getAst(filter);
  return checkNode(rootAst);
}
