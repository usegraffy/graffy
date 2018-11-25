/*
  makeOperation: Return an interval operation for the given logic flags.

  An interval operation is a function that accepts two interval sets and
  returns an interval set.

  An interval set is a sorted array with an even number of elements, where
  each pair of elements form a closed interval.

  The logic flags may each be zero or 1, and they are:
  - lFlag: Only keep values from the left interval set that are strictly
           outside (0) or inside (1) the right interval set
  - rFlag: Only keep values from the right interval set that are strictly
           outside (0) or inside (1) the left interval set
*/

function makeOperation(lFlag, rFlag) {
  const cFlag = (lFlag + rFlag) % 2;
  return function (left, right) {
    let i = 0;
    let uni = [];

    for (let j = 0; j < right.length; j++) {
      while (left[i] < right[j]) {
        if (j % 2 === lFlag) uni.push(left[i]);
        i++;
      }
      if (left[i] === right[j]) {
        if ((i + j) % 2 === cFlag) uni.push(left[i]);
        i++;
        continue;
      }
      if (i % 2 === rFlag) uni.push(right[j]);
    }

    if (!lFlag) uni.push(...left.slice(i));
    return uni;
  };
}

export const union = makeOperation(0, 0);
export const inter = makeOperation(1, 1);
export const diff = makeOperation(0, 1);
