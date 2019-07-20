import isEmpty from 'lodash/isEmpty';

export function addQueries(a, b) {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return (
      (typeof a === 'number' ? a : Number(!!a)) +
      (typeof b === 'number' ? b : Number(!!b))
    );
  }

  const sum = {};

  for (const key in a) {
    if (!(key in b)) sum[key] = b[key];
  }

  for (const key in b) {
    if (!(key in a)) {
      sum[key] = b[key];
      continue;
    }

    sum[key] = addQueries(a[key], b[key]);
  }

  return sum;
}

export function subtractQueries(a, b) {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return Math.max(
      0,
      (typeof a === 'number' ? a : Number(!!a)) -
        (typeof b === 'number' ? b : Number(!!b)),
    );
  }

  const diff = {};

  for (const key in a) {
    if (!(key in b)) diff[key] = a[key];
  }

  for (const key in b) {
    if (!(key in a)) continue;

    const keyDiff = subtractQueries(a[key], b[key]);
    if (keyDiff) diff[key] = keyDiff;
  }

  return isEmpty(diff) ? undefined : diff;
}

export function simplifyQuery(query) {
  // TODO: Make this better.
  return query;
}
