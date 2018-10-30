import { PAGE_INFO } from './constants';

// Remove nulls from a changeset immutably. Avoid copying if there are no nulls to remove.
function denull(change) {
  if (typeof change !== 'object' || !change) return change;

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

function mergePages(branchPages, changePages) {
  // TODO
  // changePages.forEach(changePage => {
  //   branchPages.forEach(branchPage)
  // });
}

/*
  Immutable merge.
*/
export function immerge(branch, change) {
  if (
    typeof change !== 'object' || !change ||
    typeof branch !== 'object' || !branch
  ) return denull(change);

  let result = {};
  for (const prop in branch) {
    if (!(prop in change)) result[prop] = branch[prop];
  }
  for (const prop in change) {
    if (prop === PAGE_INFO && PAGE_INFO in branch) continue;
    const merged = immerge(branch[prop], change[prop]);
    if (merged !== null) result[prop] = merged;
  }
  if (PAGE_INFO in change && PAGE_INFO in branch) {
    result[PAGE_INFO] = mergePages(branch[PAGE_INFO], change[PAGE_INFO]);
  }
  return result;
}
