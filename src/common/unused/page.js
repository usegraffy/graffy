/*
  The "page" data structure is:
  [[from, to], [fro, til], ...]
*/

import { sortedIndex, sortedLastIndex, sortedLastIndexBy } from 'lodash';
import { MIN_KEY, MAX_KEY } from './constants';

/*
  Compares a key with a page and returns -1, 0 or 1 when the
  key is before, inside or after the page.
*/
function compareKey(key, value) {
  if (!Array.isArray(value)) return 0;
  const [ minKey, maxKey ] = value;
  return key < minKey ? -1 : (key > maxKey ? 1 : 0);
}

/*
  Given a key and a sorted array of non-overlapping pages,
  finds the index of the page that includes the key or,
  if no such page exists, returns the index at which such
  a page should be inserted.
*/
export function getIx(key, pages) {
  return sortedLastIndexBy(pages, 0, compareKey.bind(null, key));
}

export function getPage(key, pages) {
  const page = pages[getIx(key, pages)];
  return (page && compareKey(key, page) === 0) ? page : undefined;
}

/*
  Computes the union of two arrays of sorted, non-overlapping pages.
*/
export function union(pages, newPages) {
  for (const [ minKey, maxKey ] of newPages) {
    const minIx = getIx(minKey, pages);
    const maxIx = getIx(maxKey, pages);
    const minPage = pages[minIx];
    const maxPage = pages[maxIx];
    const mergedPage = [
      compareKey(minKey, minPage) ? minKey : minPage.minKey,
      compareKey(maxKey, maxPage) ? maxKey : maxPage.maxKey,
    ];
    pages.splice(minIx, maxIx - minIx, mergedPage);
  }
}

function minKey(a, b) {
  return a < b ? a : b;
}

function maxKey(a, b) {
  return a > b ? a : b;
}

/*
  Given a range object, a sorted array of keys and a sorted array of pages,
  returns those keys that are certain to fall within the range.
*/
export function filterKeys(range, keys, pages) {
  pages = pages || [[MIN_KEY, MAX_KEY]];
  keys = keys || [];

  const rangeMinKey = range.after || MIN_KEY;
  const rangeMaxKey = range.before || MAX_KEY;

  const minPage = getPage(rangeMinKey, pages);
  const maxPage = getPage(rangeMaxKey, pages);

  let minIx, maxIx;

  if (range.$around) {
    throw Error('filterKeys.around.unimplemented');
  } else if (range.first) {
    if (!minPage) return [];
    minIx = sortedIndex(keys, rangeMinKey);
    maxIx = Math.min(
      minIx + range.first,
      sortedLastIndex(keys, minKey(rangeMaxKey, minPage[1]))
    );
  } else if (range.last) {
    if (!maxPage) return [];
    maxIx = sortedLastIndex(keys, rangeMaxKey);
    minIx = Math.max(
      maxIx - range.last,
      sortedIndex(keys, maxKey(rangeMinKey, maxPage[0]))
    );
    return keys.slice(minIx, maxIx);
  } else {
    minIx = sortedIndex(keys, rangeMinKey);
    maxIx = sortedLastIndex(keys, rangeMaxKey);
  }
  return keys.slice(minIx, maxIx);
}

/*
  Finds the index of the range containing a particular value.
  @param value - What to find
  @param [min=0] - Index position to min at
  @param [max=length] - Index position to max

function indexOf(known, value) {
  let pos, min = 0, max = this.arr.length;

  while (min < max) {
    pos = ((min + max) / 2) | 0;
    if (
      this.arr[pos] &&
      (this.arr[pos].length === 2 ? this.arr[pos][1] : this.arr[pos][0]) < value
    ) {
      min = pos + 1;
    } else if (this.arr[pos - 1] && this.arr[pos - 1][0] >= value) {
      max = pos - 1;
    } else {
      min = pos;
      break;
    }
  }
  while (this.arr[min - 1] && this.arr[min - 1][0] === value) min--;
  return min;
}

contains (value) {
  let range = this.arr[this.indexOf(value)];
  if (range && (
    range[0] === value ||
    range.length === 2 && range[0] <= value && range[1] >= value
  )) {
    return true;
  }
  return false;
}

difference(ranges) {
  let a = new Stepper(this),
    b = new Stepper(ranges),
    res = [];

  function pushBound(value) {
    if (res.length === 0 || res[res.length - 1].length === 2) {
      res.push([ value ]);
    } else {
      res[res.length - 1].push(value);
    }
  }

  function step() {
    let na = a.next(),
      nb = b.next();

    if (na < nb || na === nb && a.inRange) {
      if (!b.inRange) pushBound(na);
      a.step();
    } else {
      if (a.inRange) pushBound(nb);
      b.step();
    }
  }

  if (a.arr.length === 0) { return new RangeArray([]); }
  if (b.arr.length === 0) { return new RangeArray(this); }

  while (a.pos <= a.arr.length && b.pos <= b.arr.length) { step(); }
  return new RangeArray(res);
}

intersect(ranges) {
  let a = new Stepper(this),
    b = new Stepper(ranges),
    res = [];

  function pushBound(value) {
    if (res.length === 0 || res[res.length - 1].length === 2) {
      res.push([ value ]);
    } else {
      res[res.length - 1].push(value);
    }
  }

  function step() {
    let na = a.next(),
      nb = b.next();

    if (na < nb) {
      if (b.inRange) pushBound(na);
      a.step();
    } else if (nb < na) {
      if (a.inRange) pushBound(nb);
      b.step();
    } else {
      if (a.inRange === b.inRange) {
        pushBound(na);
        a.step();
        b.step();
      } else if (!a.inRange) {
        pushBound(na);
        a.step();
      } else {
        pushBound(nb);
        b.step();
      }
    }
  }

  while (a.pos < a.arr.length && b.pos < b.arr.length) { step(); }
  return new RangeArray(res);
}

add(a) {
  let range = makeRange(a),
    minPos = this.indexOf(range[0]),
    maxPos;
  if (range.length === 3) {
    if (
      !this.arr[minPos] ||
      this.arr[minPos][0] !== range[0] ||
      this.arr[minPos].length !== range.length
    ) {
      this.arr.splice(minPos, 0, range);
      return;
    }
    this.arr[minPos][1] = Math.max(this.arr[minPos][1], range[1]);
    this.arr[minPos][2] = Math.max(this.arr[minPos][2], range[2]);
  } else {
    maxPos = this.indexOf(range[1]);

    if (this.arr[minPos] && this.arr[minPos][0] < range[0]) {
      range[0] = this.arr[minPos][0];
    }
    if (this.arr[maxPos] && this.arr[maxPos][0] <= range[1]) {
      range[1] = this.arr[maxPos][1];
      maxPos++;
    }
    this.arr.splice(minPos, maxPos - minPos, range);
  }
}

put(r) {
  let range = makeRange(r),
    minPos = this.indexOf(range[0]);

  this.arr.splice(minPos, 0, range);
}

toJSON() {
  return this.arr;
}

get(index) {
  if (typeof index !== 'number') return this.arr;
  else return this.arr[index];
}

hasMin() {
  return this.arr[0][0] === -Infinity;
}

hasMax() {
  return this.arr[this.arr.length - 1][1] === Infinity;
}

packArguments () {
  return [ this.arr ];
}

*/
