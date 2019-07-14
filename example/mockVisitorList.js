import faker from 'faker';
import { graph, link, page } from '@graffy/decorate';
import { merge, unwrap } from '@graffy/struct';

import { debug } from '@graffy/testing';

const state = graph({ visitors: {}, visitorsByTime: page({}) });
const freeIds = new Set();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default function(g) {
  g.onGet(() => {
    // console.log('Get: Returning', debug(state));
    return state;
  });

  g.onSub(async function*() {
    yield;
    while (true) {
      ts = Date.now();
      yield simulate();
      await sleep(1 + Math.random() * 100);
    }
  });
}

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

let ts;
let id = 1;

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

  // console.log('create', addId, ts);
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
  delId = '' + delId;

  const delTs = unwrap(state, ['visitors', delId, 'ts']);

  freeIds.add(delId);
  // console.log('delete', delId, delTs);
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

ts = Date.now();
while (id < 200) {
  const change = simulateEnter();
  merge(state, change);
  ts -= Math.floor(1 + Math.random() * 100);
}

// console.log('Done init', debug(state));

// console.log(visitors);

// --- for testing

// setInterval(() => {
//   ts = Date.now();
//   simulate();
// }, 1 + Math.random() * 1000);
