import { LINK_KEY, PAGE_KEY } from './constants';
import { union } from './interval';
import { makeNode, getNode } from './path';

// Remove nulls from a changeset immutably. Avoid copying if there are no nulls to remove.
function denull(change) {
  if (typeof change !== 'object' || !change || Array.isArray(change))
    return change;

  let result = change;
  for (const prop in change) {
    if (change[prop] === null) {
      if (result === change) result = { ...change };
      delete result[prop];
    }
    const denulled = denull(change[prop]);
    if (denulled !== change[prop]) {
      if (result === change) result = { ...change };
      result[prop] = denulled;
    }
  }
  return result;
}

export default function apply(rootState, rootChange) {
  function merge(stateNode, changeNode) {
    for (const prop in changeNode) {
      const change = changeNode[prop];
      const state = stateNode[prop];

      if (
        prop === LINK_KEY ||
        prop === PAGE_KEY ||
        typeof change === 'undefined'
      ) {
        continue;
      }

      if (change === null) {
        delete stateNode[prop];
        continue;
      }

      if (typeof change !== 'object') {
        stateNode[prop] = change;
        continue;
      }

      if (change[LINK_KEY]) {
        const ref = change[LINK_KEY];
        stateNode[prop] = makeNode(rootState, ref);
        merge(stateNode[prop], getNode(rootChange, ref) || change);
        continue;
      }

      if (typeof state !== 'object') {
        stateNode[prop] = denull(change);
        continue;
      }

      merge(state, change);
    }

    if (changeNode[LINK_KEY]) stateNode[LINK_KEY] = changeNode[LINK_KEY];
    if (changeNode[PAGE_KEY]) {
      stateNode[PAGE_KEY] = union(
        stateNode[PAGE_KEY] || [],
        changeNode[PAGE_KEY],
      );
    }
  }

  merge(rootState, rootChange);
}
