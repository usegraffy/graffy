const visitors = {};
const visitorsByTime = {};

export default function (g) {
  g.onGet('/visitors', (q) => {
    return { visitors };
  });

  g.onGet('/visitorsByTime', (q) => {
    return { visitorsByTime };
  });

  setInterval(() => {
    const { id, ts } = simulate();
    // console.log('Simulated', id, ts);
    g.pub({
      visitors: { [id]: visitors[id] },
      visitorsByTime: { [ts]: visitorsByTime[ts] }
    });
  }, 1000)
}

function randId() {
  let id = '';
  for (let i = 0; i < 1; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
}

let ts = 100000000;
function simulate() {
  ts++;
  const id = randId();
  if (visitors[id]) {
    delete visitorsByTime[visitors[id].ts];
    visitors[id].ts = ts;
  } else {
    visitors[id] = { id, ts };
  }
  visitorsByTime[ts] = `/visitors/${id}`;
  return visitors[id];
}

for (let i = 0; i < 1000; i++) simulate();
