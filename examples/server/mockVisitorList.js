const faker = require('faker');
const { makeLink } = require('@graffy/core');

const visitors = {};
const visitorsByTime = {};
const freeIds = [];

module.exports = function(g) {
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
  }, 1 + Math.random() * 100);
};

function simulate() {
  const change =
    Math.random() < 0.9
      ? simulateUpdate()
      : Math.random() < 0.5
      ? simulateEnter()
      : simulateLeave();
  return change;
}

function visitorInfo() {
  return {
    name: faker.internet.userName(),
    avatar: faker.internet.avatar(),
    pageviews: {
      [ts]: faker.internet.url(),
    },
  };
}

let ts;
let id = 1;

function simulateEnter() {
  let addId = freeIds.length ? freeIds.pop() : id++;

  visitors[addId] = { id: addId, ts, ...visitorInfo() };
  visitorsByTime[ts] = makeLink(['visitors', addId]);

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
  freeIds.push(delId);
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
  const url = faker.internet.url();
  visitors[upId].pageviews.ts = url;
  return { visitors: { [upId]: { pageviews: { [ts]: url } } } };
}

ts = Date.now();
while (id < 200) {
  simulateEnter();
  ts -= Math.floor(1 + Math.random() * 100);
}

// console.log(visitors);

// --- for testing

// setInterval(() => {
//   ts = Date.now();
//   simulate();
// }, 1 + Math.random() * 1000);