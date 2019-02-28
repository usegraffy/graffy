import faker from 'faker';
import { LINK_KEY } from '@grue/common';

const visitors = {};
const visitorsByTime = {};

export default function(g) {
  g.onGet('/visitors', () => {
    // console.log('visitors', query);
    return { visitors };
  });

  g.onGet('/visitorsByTime', () => {
    // console.log('visitorsByTime', JSON.stringify(query, null, 2));
    return { visitorsByTime };
  });

  setInterval(() => {
    ts = Date.now();
    const change = simulate();
    g.pub(change);
  }, 1 + Math.random() * 2000);
}

function simulate() {
  const change =
    Math.random() < 0.5
      ? simulateUpdate()
      : Math.random() < 0.5
      ? simulateEnter()
      : simulateLeave();
  return change;
}

function visitorInfo() {
  return { name: faker.name.findName() };
}

let ts;
let id = 0;

function simulateEnter() {
  let addId = Math.floor(Math.random() * id);
  if (visitors[addId]) {
    addId = id;
    id++;
  }

  visitors[addId] = { id: addId, ts, ...visitorInfo() };
  visitorsByTime[ts] = { [LINK_KEY]: ['visitors', addId] };

  return {
    visitors: { [addId]: visitors[addId] },
    visitorsByTime: { [ts]: visitorsByTime[ts] },
  };
}

function simulateLeave() {
  let delId;
  do {
    delId = Math.floor(Math.random() * id);
  } while (!visitors[delId]);
  const delTs = visitors[delId].ts;
  delete visitors[delId];
  delete visitorsByTime[delTs];
  return {
    visitors: { [delId]: null },
    visitorsByTime: { [delTs]: null },
  };
}

function simulateUpdate() {
  let upId;
  do {
    upId = Math.floor(Math.random() * id);
  } while (!visitors[upId]);
  const change = { ...visitorInfo() };
  visitors[upId] = { ...visitors[upId], ...change };
  return { visitors: { [upId]: change } };
}

ts = Date.now();
while (id < 1000) {
  simulateEnter();
  ts -= Math.floor(1 + Math.random() * 2000);
}

// --- for testing

// setInterval(() => {
//   ts = Date.now();
//   simulate();
// }, 1 + Math.random() * 1000);
