import { isBranch } from '../node/index.js';
import { find } from '../util.js';
import { cmp as compareKey } from '../util.js';

export default function add(base, diff) {
  let changed = false;

  // console.log('Add', diff);
  // console.log('before add', base);

  let index = 0;
  for (const node of diff) {
    const cmp = compare(node);
    const nodeIsBranch = isBranch(node);

    index = find(base, cmp, index);
    const item = base[index];
    const itemIsBranch = isBranch(item);

    if (!item || cmp(item)) {
      // This node doesn't exist in the base, insert it.
      base.splice(index, 0, clone(node));
      changed = true;
      continue;
    }

    if (nodeIsBranch && itemIsBranch) {
      changed = add(item.children, node.children) || changed;
    } else if (nodeIsBranch) {
      continue;
    } else if (itemIsBranch) {
      item.value = node.value;
      changed = true;
    } else {
      item.value += node.value;
    }

    // If this item was decremented to zero, remove it.
    const size = itemIsBranch ? item.children.length : item.value;
    if (!size) {
      base.splice(index, 1);
      changed = true;
    }
  }

  return changed;
}

function compare(node) {
  return (item) => {
    const v =
      compareKey(item.key, node.key) ||
      compareValue(!!item.end, !!node.end) ||
      (item.end && compareKey(item.end, node.end)) ||
      compareValue(item.limit, node.limit);
    return v;
  };
}

function compareValue(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/*
  We clone to ensure that the original query (passed as diff) never gets modified, even after successive adds.
*/

function clone(node) {
  const copy = { ...node };
  if (node.children) copy.children = node.children.map((child) => clone(child));
  return copy;
}
