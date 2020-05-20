// import WebSocket from 'ws';
import Socket from './Socket';

class MockWebSocket {
  constructor() {
    MockWebSocket.instances.push(this);
  }
  static instances = [];
  send = jest.fn();
  close = jest.fn();
}

let now = 0;
function useFakeDate() {
  Date._now = Date.now;
  Date.now = () => now;
}

function advanceTime(ms) {
  while (ms > 100) {
    now += 100;
    jest.advanceTimersByTime(100);
    ms -= 100;
  }
  now += ms;
  jest.advanceTimersByTime(ms);
}

function useRealDate() {
  Date.now = Date._now;
  delete Date._now;
}

describe('Socket', () => {
  const listeners = {};
  let socket, ws;

  function event(name) {
    return new Promise((resolve) => {
      listeners[name] = (value) => {
        delete listeners[name];
        resolve(value);
      };
    });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    useFakeDate();
    MockWebSocket.instances.splice(0);
    global.WebSocket = MockWebSocket;
    socket = new Socket('ws://localhost:3684');
    ws = MockWebSocket.instances[0];
  });

  test('connect', () => {
    expect(MockWebSocket.instances.length).toBe(1);
  });

  test('reconnect_failed', () => {
    ws.onclose();
    advanceTime(1490);
    expect(MockWebSocket.instances.length).toBe(1);
    advanceTime(20);
    expect(MockWebSocket.instances.length).toBe(2);
  });

  test('reconnect_unstable', () => {
    ws.onopen();
    ws.onclose();
    advanceTime(1490);
    expect(MockWebSocket.instances.length).toBe(1);
    advanceTime(20);
    expect(MockWebSocket.instances.length).toBe(2);
  });

  test.only('close_disconnected', () => {
    ws.onopen();
    advanceTime(41000);
    expect(ws.close).toBeCalled();
  });

  test('reconnect_stable', () => {
    ws.onopen();
    advanceTime(11000); // Connection needs to be stable for 10s
    ws.onmessage({ data: '[":ping"]' });
    expect(MockWebSocket.instances.length).toBe(1);
    ws.onclose();
    expect(MockWebSocket.instances.length).toBe(2);
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    useRealDate();
    delete global.WebSocket;
  });
});
