import { merge, slice, setVersion, makeWatcher } from '@graffy/common';
// import { debug } from '@graffy/testing';

function cowalk(trees, visit, prefix = []) {
  if (!trees.length) return;

  let cKey = '';
  const cPos = new Array(trees.length).fill(0);

  while (true) {
    let keyExists = false;

    // From each tree, get the node that matches the ccurrent position
    const nodes = cPos.map((pos, i) => {
      const { key, end } = trees[i][pos];
      if (key === cKey || (key <= cKey && end >= cKey)) {
        keyExists = true;
        return trees[i][pos];
      }
    });

    if (keyExists && visit(prefix.concat(cKey), ...nodes)) {
      // Descend into child nodes if the visitor returns true.
      cowalk(
        nodes.map(({ children } = {}) => children || []),
        visit,
        prefix.concat(cKey),
      );
    }

    if (cKey === '\uffff') return;

    // From all trees, find the earliest unvisited key to visit.
    cKey = cPos.reduce((min, pos, i) => {
      if (pos + 1 >= trees[i].length) return min;
      const { key } = trees[i][pos + 1];
      return key < min ? key : min;
    }, '\uffff');

    // Advance pos for those trees that have this cKey (this is a separate)
    // step as the same key might exist in multiple trees, and we have to
    // advance all of them.
  }
}

export default function () {
  const linkTrees = [{ key: 'user', children: [{ key: '', end: '\uffff' }] }];

  return (store) => {
    const watcher = makeWatcher();

    store.on('read', [], async (query) => {
      return setVersion(slice(state, query).known, Date.now());
    });

    store.on('watch', [], () => watcher.watch(undefined));

    store.on('write', [], async (change) => {
      merge(state, change);
      watcher.write(change);
      return change;
    });
  };
}
