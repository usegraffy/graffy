import { unwrapObject, encodePath } from '@graffy/common';
import { getAst } from './getAst.js';

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
        throw Error('pgfilter.unimplemented');
      case '$ctd':
        throw Error('pgfilter.unimplemented');
      case '$ovp':
        throw Error('pgfilter.unimplemented');
      case '$and':
        throw Error('pgfilter.unimplemented');
      case '$or':
        throw Error('pgfilter.unimplemented');
      case '$not':
        throw Error('pgfilter.unimplemented');
      case '$any':
        throw Error('pgfilter.unimplemented');
      case '$all':
        throw Error('pgfilter.unimplemented');
      case '$has':
    }
  }

  const rootAst = getAst(filter);
  return checkNode(rootAst);
}
