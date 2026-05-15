import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import Socket from './Socket.ts';

class MockWebSocket {
  constructor() {
    this.send = mock.fn();
    this.close = mock.fn();
    MockWebSocket.instances.push(this);
  }
}
MockWebSocket.instances = [];

describe('Socket', () => {
  let socket;
  let ws;
  let actualWebSocket;

  beforeEach(() => {
    mock.timers.enable([
      'Date',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
    ]);
    MockWebSocket.instances.splice(0);
    actualWebSocket = globalThis.WebSocket;
    // @ts-expect-error
    globalThis.WebSocket = MockWebSocket;
    socket = Socket('ws://localhost:3684');
    ws = MockWebSocket.instances[0];
  });

  afterEach(async () => {
    mock.timers.reset();
    globalThis.WebSocket = actualWebSocket;
  });

  test('connect', () => {
    assert.strictEqual(MockWebSocket.instances.length, 1);
  });

  test('reconnect_failed', () => {
    ws.onclose();
    mock.timers.tick(1490);
    assert.strictEqual(MockWebSocket.instances.length, 1);
    mock.timers.tick(20);
    assert.strictEqual(MockWebSocket.instances.length, 2);
  });

  test('reconnect_later_unstable', () => {
    ws.onopen();
    ws.onclose();
    mock.timers.tick(1490);
    assert.strictEqual(MockWebSocket.instances.length, 1);
    mock.timers.tick(20);
    assert.strictEqual(MockWebSocket.instances.length, 2);
  });

  test('reconnect_immediately_stable', () => {
    ws.onopen();
    mock.timers.tick(11000); // Connection needs to be stable for 10s
    ws.onmessage({ data: '[":ping"]' });
    assert.strictEqual(MockWebSocket.instances.length, 1);
    ws.onclose();
    assert.strictEqual(MockWebSocket.instances.length, 2);
  });

  test('close_ping_timeout', () => {
    ws.onopen();
    mock.timers.tick(41000);
    assert.ok(ws.close.mock.callCount() > 0);
  });

  test('no_close_if_pings', () => {
    ws.onopen();
    mock.timers.tick(39000);
    ws.onmessage({ data: '[":ping"]' });
    mock.timers.tick(10000);
    assert.strictEqual(ws.close.mock.callCount(), 0);
  });

  describe('cleared_timer_after_stable', () => {
    beforeEach(() => {
      ws.onopen();
      mock.timers.tick(11000);
      ws.onmessage({ data: '[":ping"]' });
      mock.timers.reset();
      mock.timers.enable([
        'Date',
        'setTimeout',
        'setInterval',
        'clearTimeout',
        'clearInterval',
      ]);
      mock.timers.tick(11000); // Re-advance Date.now()

      mock.timers.tick(41000);
      assert.strictEqual(ws.close.mock.callCount(), 0); // Timers were cleared
    });
    test('reconnect_on_start', () => {
      socket.start(['example']);
      assert.ok(ws.close.mock.callCount() > 0);
    });
  });
});
