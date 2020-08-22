import { variants } from './variants';
import { count } from './scalar';
import { struct } from './tuple';

function pageTypes(t) {
  return {
    f: struct({ first: count }),
    l: struct({ last: count }),
    n: struct({ first: count, after: t }),
    p: struct({ last: count, before: t }),
    t: struct({ first: count, after: t, before: t }),
    b: struct({ last: count, after: t, before: t }),
  };
}

export const map = (kt, vt) => {
  if (!kt.isBounded) throw Error('map.define.keyType');
  const pts = pageTypes(kt);
  variants({
    validate(val) {
      for (const k in val) {
        if (!kt.validate(k) || !vt.validate(val[k])) return false;
      }
      return true;
    },
    descend([i, ...path]) {
      if (i === undefined) return this;
      return vt.descend(path);
    },
    intoKey() {
      throw Error('map.intoKey');
    },
    fromKey() {
      throw Error('map.fromKey');
    },

    encodeKey(val) {
      const arr = [];
      kt.intoKey(val, arr);
      return arr.join('\0');
    },

    encodePage(page) {
      const { first, last, before, after } = page;
      const encodePageType = (n) => {
        const arr = [];
        pts[n].intoKey(page, arr);
        return '\0' + n + arr.join('\0');
      };
      if (before && after && last) return encodePageType('b');
      if (before && after && first) return encodePageType('t');
      if (before && last) return encodePageType('p');
      if (after && first) return encodePageType('n');
      if (last) return encodePageType('l');
      if (first) return encodePageType('f');
      throw new Error('map.encodePage.pageType');
    },

    decodeKey(val) {
      if (name.charCodeAt(0)) return kt.fromKey(val.split('\0'));
      return pts[name[1]].fromKey(val.substr(2));
    },

    isCollection: true,
    isBounded: false,
  });
};
