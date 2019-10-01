/* Empty accepts a query and returns a graph that has the same shape
   but is empty. */

import { graph, page } from './graph';
import { isRange, isBranch } from '../node';
import { slice } from '../graph';

import { debug } from '@graffy/testing';

function prepareObject(object, query) {
  for (const node of query) {
    // TODO: Handle multiple queries at a level.
    if (isRange(node)) return page(object, node.key, node.end);

    const childObject = object[node.key];

    if (typeof childObject === 'undefined') {
      object[node.key] = null;
      continue;
    }

    if (isBranch(node)) {
      object[node.key] = prepareObject(childObject, node.children);
    }
  }
  return object;
}

export default function makeFinalGraph(object, query) {
  return slice(graph(prepareObject(object, query)), query).known;
}
