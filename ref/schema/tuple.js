import { variants } from './variants';

export const tuple = (...ts) =>
  variants({
    validate(val) {
      return ts.every((t, i) => t.validate(val[i]));
    },
    descend([i, ...path]) {
      if (i === undefined) return this;
      return ts[i] && ts[i].descend(path);
    },

    intoKey(val, arr) {
      ts.forEach((t, i) => t.intoKey(val[i], arr));
    },
    fromKey(arr) {
      return ts.map((t) => t.fromKey(arr));
    },
    min: ts.map((t) => t.min),
    max: ts.map((t) => t.max),
    isBounded: ts.some((t) => t.isBounded),
  });

export const struct = (query) => {
  const keys = Object.keys(query).sort();
  keys.mapObj = (fn) => {
    let obj = {};
    keys.forEach((k) => (obj[k] = fn(k)));
    return obj;
  };
  return variants({
    validate(val) {
      return keys.every((k) => query[k].validate(val[k]));
    },
    descend([i, ...path]) {
      if (i === undefined) return this;
      return query[i] && query[i].descend(path);
    },
    intoKey(val, arr) {
      keys.forEach((k) => query[k].intoKey(val[k], arr));
    },
    fromKey(arr) {
      return keys.mapObj((k) => query[k].fromKey(arr));
    },
    min: keys.mapObj((k) => query[k].min),
    max: keys.mapObj((k) => query[k].max),
    isBounded: keys.some((key) => query[key].isBounded),
  });
};
