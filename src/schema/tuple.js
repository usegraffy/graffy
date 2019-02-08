import { variants } from './variants';

export const tuple = (...ts) => variants({
  validate(val) { return ts.every((t, i) => t.validate(val[i])); },
  descend([i, ...path]) {
    if (i === undefined) return this;
    return ts[i] && ts[i].descend(path);
  },

  intoKey(val, arr) { ts.forEach((t, i) => t.intoKey(val[i], arr)); },
  fromKey(arr) { return ts.map((t, i) => t.fromKey(arr)); },
  min: ts.map(t => t.min),
  max: ts.map(t => t.max),
  isBounded: ts.some(t => t.isBounded)
});

export const struct = shape => {
  const keys = Object.keys(shape).sort();
  keys.mapObj = fn => {
    let obj = {};
    keys.forEach(k => obj[k] = fn(k));
    return obj;
  }
  return variants({
    validate(val) { return keys.every(k => shape[k].validate(val[k])); },
    descend([i, ...path]) {
      if (i === undefined) return this;
      return shape[i] && shape[i].descend(path);
    },
    intoKey(val, arr) { keys.forEach(k => shape[k].intoKey(val[k], arr)); },
    fromKey(arr) { return keys.mapObj(k => shape[k].fromKey(arr)); },
    min: keys.mapObj(k => shape[k].min),
    max: keys.mapObj(k => shape[k].max),
    isBounded: keys.some(key => shape[key].isBounded)
  });
};
