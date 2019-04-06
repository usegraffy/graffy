import isEmpty from 'lodash/isEmpty';

export function addQueries(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a + b;
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
}

export function subtractQueries(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.max(0, a - b);
  const diff = {};

  for (const key in a) {
    if (!(key in b)) diff[key] = b[key];
  }

  for (const key in b) {
    if (!(key in a)) {
      diff[key] = b[key];
      continue;
    }

    const keyDiff = subtractQueries(a[key], b[key]);
    if (keyDiff) diff[key] = keyDiff;
  }

  return isEmpty(diff) ? undefined : diff;
}

export function simplifyQuery(query) {
  // TODO: Make this better.
  return query;
}
