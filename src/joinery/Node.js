class Leaf {
  constructor(parent, key) {
    this._key = key;
    this._parent = parent;
    this._root = parent ? parent._root : this;

    if (parent) parent.addChild(this);
  }
}

class Branch extends Array {
  constructor(parent, key) {
    super();
    this._key = key;
    this._parent = parent;
    this._root = parent ? parent._root : this;

    if (parent) parent.addChild(this);
  }

  addChild(child) {
    this.push(child);
  }
}

const root = new Branch();
console.log(Array.isArray(root));

// const foo = new Branch(root, 'foo');
// const bar = new Branch(root, 'bar');
//
// new Leaf(bar, 'baz');
//
// console.log(root);
//
