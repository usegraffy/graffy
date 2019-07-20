import faker from 'faker';
import { graph, link, page } from '@graffy/decorate';
import { merge, unwrap } from '@graffy/struct';
import makeStream from '@graffy/stream';

// import { debug } from '@graffy/testing';

const state = graph({ visitors: {}, visitorsByTime: page({}) });
const freeIds = new Set();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const listeners = new Set();

export default function(g) {
  g.onGet(() => {
    // console.log('Get: Returning', debug(state));
    return state;
  });

  g.onSub(() =>
    makeStream((push, _end) => {
      listeners.add(push);
      push(undefined);
      return () => listeners.delete(push);
    }),
  );
}

let ts = Date.now();
let id = 0;

while (id < 200) {
  const change = simulateEnter();
  merge(state, change);
  ts -= Math.floor(1 + Math.random() * 100);
}

(async function() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    ts = Date.now();
    const change = simulate();
    for (const push of listeners) push(change);
    await sleep(10);
    // await sleep(1 + Math.random() * 100);
  }
})();

function simulate() {
  const change =
    Math.random() < 0.9
      ? simulateUpdate()
      : Math.random() < 0.5
      ? simulateEnter()
      : simulateLeave();

  merge(state, change);
  return change;
}

function visitorInfo() {
  return {
    name: faker.internet.userName(),
    avatar: faker.internet.avatar(),
    pageviews: page({
      [ts]: faker.internet.url(),
    }),
  };
}

function simulateEnter() {
  let addId;
  if (freeIds.size) {
    for (const id of freeIds) {
      addId = id;
      freeIds.delete(addId);
      break;
    }
  } else {
    addId = id++;
  }
  addId = '' + addId;

  console.log(ts, 'create', addId);
  return graph(
    {
      visitors: { [addId]: { id: addId, ts, ...visitorInfo() } },
      visitorsByTime: { [ts]: link(['visitors', addId]) },
    },
    ts,
  );
}

function simulateLeave() {
  let delId;
  do {
    delId = Math.floor(Math.random() * id);
  } while (freeIds.has(delId));
  freeIds.add(delId);
  delId = '' + delId;

  const delTs = unwrap(state, ['visitors', delId, 'ts']);
  // console.log('Unwrap', debug(state), ['visitors', delId, 'ts'], delTs);

  console.log(ts, 'delete', delId, delTs);
  return graph(
    {
      visitors: { [delId]: null },
      visitorsByTime: { [delTs]: null },
    },
    ts,
  );
}

function simulateUpdate() {
  let upId;
  do {
    upId = Math.floor(Math.random() * id);
  } while (freeIds.has(upId));
  upId = '' + upId;
  const url = faker.internet.url();
  // console.log('updated', upId);
  return graph({ visitors: { [upId]: { pageviews: { [ts]: url } } } }, ts);
}
