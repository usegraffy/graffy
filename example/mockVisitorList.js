import faker from 'faker';
import { makeGraph, link, page } from '@graffy/common';

const TARGET = 2000;

// const state = makeGraph({ visitors: {}, visitorsByTime: page({}) });
const freeIds = new Set();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let store;
let ts = Date.now();
let id = 0;
let enter = 0,
  leave = 0,
  update = 0;

// const listeners = new Set();

export default function(g) {
  store = g;

  while (id < TARGET) {
    store.call('write', simulateEnter());
    ts -= Math.floor(1 + Math.random() * 100);
  }

  (async function() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      ts = Date.now();
      store.call('write', await simulate());
      await sleep(1);
    }
  })();

  if (process.stdout.isTTY) {
    (async function() {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        process.stdout.cursorTo(0);
        process.stdout.write(
          `${id - freeIds.size} users `.padStart(16) +
            `${enter} enters `.padStart(16) +
            `${leave} leaves `.padStart(16) +
            `${update} updates `.padStart(16),
        );
        await sleep(500);
      }
    })();
  }
}

function simulate() {
  const change =
    Math.random() < 0.9
      ? simulateUpdate()
      : Math.random() < (id - freeIds.size) / 2 / TARGET
      ? simulateLeave()
      : simulateEnter();

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

  enter++;
  return makeGraph(
    {
      visitors: { [addId]: { id: addId, ts, ...visitorInfo() } },
      visitorsByTime: { [ts]: link(['visitors', addId]) },
    },
    ts,
  );
}

async function simulateLeave() {
  let delId;
  do {
    delId = Math.floor(Math.random() * id);
  } while (freeIds.has(delId));
  freeIds.add(delId);
  delId = '' + delId;

  const delTs = (await store.read(['visitors', delId], { ts: true })).ts;
  // const delTs = unwrap(state, ['visitors', delId, 'ts']);
  // console.log('Unwrap', debug(state), ['visitors', delId, 'ts'], delTs);

  leave++;
  return makeGraph(
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
  update++;
  return makeGraph({ visitors: { [upId]: { pageviews: { [ts]: url } } } }, ts);
}
