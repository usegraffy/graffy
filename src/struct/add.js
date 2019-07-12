import { find } from './find';
import { isBranch } from './nodeTypes';

export default function add(base, diff) {
  let changed = false;

  let index = 0;
  for (const node of diff) {
    const cmp = compare(node);
    const nodeIsBranch = isBranch(node);

    index = find(base, cmp, index);
    const item = base[index];
    const itemIsBranch = isBranch(item);

    if (!item || cmp(item)) {
      // This node doesn't exist in the base, insert it.
      base.splice(index, 0, node);
      changed = true;
      continue;
    }

    if (nodeIsBranch && itemIsBranch) {
      changed = add(item.children, node.children) || changed;
    } else if (nodeIsBranch || itemIsBranch) {
      throw new Error('add.branch_leaf_mismatch');
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
  return item => {
    const v =
      compareValue(item.key, node.key) ||
      compareValue(item.end, node.end) ||
      compareValue(item.count, node.count);
    return v;
  };
}

function compareValue(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
