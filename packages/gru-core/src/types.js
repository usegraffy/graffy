const TYPE = Symbol();
const REQD = Symbol();

function defType(name, defs) {
  const t = { ...defs, [TYPE]: name, [REQD]: false };
  t.required = { ...t, [REQD]: true };
  return t;
}

const scalar = {
  validate(val) { return typeof val === this[TYPE] ||
    !this[REQD] && (val === void 0 || val === null); },
  deflate(val, arr) { arr.push(val); },
  inflate(arr) { return arr.shift(); }
}

export const string = defType('string', scalar);
export const number = defType('number', scalar);
export const boolean = defType('boolean', scalar);

export const tuple = (...ts) => defType('tuple', {
  validate(vals) { return ts.every((t, i) => t.validate(vals[i])); },
  deflate(vals, arr) { ts.forEach((t, i) => t.deflate(vals[i], arr)); },
  inflate(arr) { return ts.map((t, i) => t.inflate(arr)); }
});

const KEYS = Symbol();
export const struct = shape => defType('struct', {
  [KEYS]: Object.keys(shape).sort(),
  validate(val) { return this[KEYS].every(k => shape[k].validate(val[k])); },
  deflate(val, arr) { this[KEYS].forEach(k => shape[k].deflate(val[k], arr)); },
  inflate(arr) {
    let obj = {};
    this[KEYS].forEach(k => obj[k] = shape[k].inflate(arr));
    return obj;
  }
});

export const set = t => defType('set', {
  validate(vals) { return vals.every(val => t.validate(val)); },
  deflate() { throw Error('Sets cannot be deflated'); },
  inflate() { throw Error('Sets cannot be inflated'); }
});

export const map = (kt, vt) => defType('map', {
  validate(val) {
    for (const k in val) {
      if (!kt.validate(k) || !vt.validate(val[k])) return false;
    }
    return true;
  },
  deflate() { throw Error('Maps cannot be deflated'); },
  inflate() { throw Error('Maps cannot be inflated'); }
});


// Define schema using shorthand

// export const schema(val) {
//   if (typeof val !== 'object') throw Error('Schema Error');
//   if (val[TYPE]) return val;
//
//   if (Array.isArray(val)) {
//     const valType = val[val.length - 1];
//     if (
//   }
//
//   for (
//
// }
