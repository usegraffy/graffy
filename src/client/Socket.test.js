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

describe('Socket', () => {
  let socket, ws;

  beforeEach(() => {
    jest.useFakeTimers('modern');
    MockWebSocket.instances.splice(0);
    global.WebSocket = MockWebSocket;
    socket = new Socket('ws://localhost:3684');
    ws = MockWebSocket.instances[0];
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    delete global.WebSocket;
  });

  test('connect', () => {
    expect(MockWebSocket.instances.length).toBe(1);
  });

  test('reconnect_failed', () => {
    ws.onclose();
    jest.advanceTimersByTime(1490);
    expect(MockWebSocket.instances.length).toBe(1);
    jest.advanceTimersByTime(20);
    expect(MockWebSocket.instances.length).toBe(2);
  });

  test('reconnect_later_unstable', () => {
    ws.onopen();
    ws.onclose();
    jest.advanceTimersByTime(1490);
    expect(MockWebSocket.instances.length).toBe(1);
    jest.advanceTimersByTime(20);
    expect(MockWebSocket.instances.length).toBe(2);
  });

  test('reconnect_immediately_stable', () => {
    ws.onopen();
    jest.advanceTimersByTime(11000); // Connection needs to be stable for 10s
    ws.onmessage({ data: '[":ping"]' });
    expect(MockWebSocket.instances.length).toBe(1);
    ws.onclose();
    expect(MockWebSocket.instances.length).toBe(2);
  });

  test('close_ping_timeout', () => {
    ws.onopen();
    jest.advanceTimersByTime(41000);
    expect(ws.close).toBeCalled();
  });

  test('no_close_if_pings', () => {
    ws.onopen();
    jest.advanceTimersByTime(39000);
    ws.onmessage({ data: '[":ping"]' });
    jest.advanceTimersByTime(10000);
    expect(ws.close.mock.calls.length).toBe(0);
  });

  describe('cleared_timer_after_stable', () => {
    beforeEach(() => {
      ws.onopen();
      jest.advanceTimersByTime(11000);
      ws.onmessage({ data: '[":ping"]' });
      jest.clearAllTimers();
      jest.advanceTimersByTime(11000); // Re-advance Date.now()

      jest.advanceTimersByTime(41000);
      expect(ws.close.mock.calls.length).toBe(0); // Timers were cleared
    });
    test('reconnect_on_start', () => {
      socket.start(['example']);
      expect(ws.close).toBeCalled();
    });
  });
});
