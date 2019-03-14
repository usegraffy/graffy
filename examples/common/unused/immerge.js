import { PAGE_KEY, LINK_KEY } from './constants';
import { union } from './interval';

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

/*
  Immutable merge.
*/
export default function immerge(branch, change) {
  if (
    typeof change !== 'object' ||
    !change ||
    typeof branch !== 'object' ||
    !branch
  )
    return denull(change);

  let result = {};
  for (const prop in branch) {
    if (!(prop in change)) result[prop] = branch[prop];
  }
  for (const prop in change) {
    if (prop === PAGE_KEY) continue;
    if (prop === LINK_KEY) {
      result[LINK_KEY] = change[LINK_KEY];
      continue;
    }
    const merged = immerge(branch[prop], change[prop]);
    if (merged !== null) result[prop] = merged;
  }
  if (PAGE_KEY in change || PAGE_KEY in branch) {
    result[PAGE_KEY] = union(branch[PAGE_KEY] || [], change[PAGE_KEY] || []);
  }
  return result;
}
