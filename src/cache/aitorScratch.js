/* eslint no-console: off */

async function* g() {
  for (let i = 0; i < 10; i++) {
    let j = await Promise.resolve(i);
    try {
      let k = yield j;
      console.log('Yieldback', k);
    } catch (e) {
      console.log('Caught', e);
      return;
    }
  }
}

function h() {
  let i = 0;
  let done = false;
  return {
    next() {
      console.log('Next');
      i++;
      if (i >= 10) done = true;
      return Promise.resolve({ value: i, done });
    },
    return(v) {
      console.log('Return');
      done = true;
      return Promise.resolve({ value: v, done });
    },
    throw(e) {
      console.log('Throw');
      done = true;
      return Promise.resolve({ value: e, done });
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}


async function test(ator) {
  // console.log('TEST1');
  for await (const i of ator()) {
    // console.log(i);
    if (i === 3) break;
  }

  // console.log('TEST2');
  // for await (const i of ator()) {
  //   console.log(i);
  //   if (i === 3) throw new Error('Foo');
  // }
}

// console.log('TESTING G');
// test(g).then(() => {
//   console.log('TESTING H');
//   test(h);
// });


const aitor = g();

aitor.next()
  .then(() => aitor.next())
  .then(() => aitor.throw('asdf'));
