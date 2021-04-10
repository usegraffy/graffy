import faker from 'faker';
import fakataaar from 'fakataaar';
import debug from 'debug';
const log = debug('graffy:website:server');
import { encodeGraph } from '@graffy/common';

const TARGET = 30;
const VARIANCE = 5; // Allow TARGET +/- VARIANCE.
const RATE = 5;

const freeIds = new Set();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let store;
let ts = Date.now();
let id = 0;
let enter = 0,
  leave = 0,
  update = 0;

export default function (s) {
  store = s;

  while (id < TARGET) {
    store.call('write', simulateEnter());
    ts -= Math.floor(1 + Math.random() * 10000);
  }

  (async function () {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      ts = Date.now();
      store.call('write', await simulate());
      await sleep(1000 / RATE);
    }
  })();

  (async function () {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const line =
        `${id - freeIds.size} users `.padStart(16) +
        `${enter} enters `.padStart(16) +
        `${leave} leaves `.padStart(16) +
        `${update} updates `.padStart(16);

      if (process.stdout.isTTY) {
        process.stdout.cursorTo(0);
        process.stdout.write(line);
        await sleep(500);
      } else {
        log(line);
        await sleep(10000);
      }
    }
  })();
}

function simulate() {
  if (Math.random() < 0.9) return simulateUpdate();

  const excess = id - freeIds.size - TARGET;
  const threshold = (excess / VARIANCE + 1) / 2;

  return Math.random() < threshold ? simulateLeave() : simulateEnter();
}

function visitorInfo() {
  return {
    name: faker.internet.userName(),
    avatar:
      'data:image/svg+xml;base64,' +
      Buffer.from(fakataaar()).toString('base64'),
    pageviews: [{ $key: [ts], $val: faker.system.directoryPath() }],
  };
}

function index(ts) {
  return { order: ['ts'], cursor: [ts] };
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
  return encodeGraph(
    {
      visitors: [
        { $key: addId, id: addId, ts, ...visitorInfo() },
        { $key: index(ts), $ref: ['visitors', addId] },
      ],
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
  return encodeGraph(
    { visitors: [{ $key: delId }, { $key: index(delTs) }] },
    ts,
  );
}

function simulateUpdate() {
  let upId;
  do {
    upId = Math.floor(Math.random() * id);
  } while (freeIds.has(upId));
  upId = '' + upId;
  const url = faker.system.directoryPath();
  update++;
  return encodeGraph(
    { visitors: { [upId]: { pageviews: [{ $key: [ts], $val: url }] } } },
    ts,
  );
}
