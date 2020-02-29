/*
  This class implements a self-healing wrapper around a WebSocket, with
  a higher level concept of "requests". Requests are retried when a connection
  reconnects.
*/
import { makeId } from '@graffy/common';

const MIN_DELAY = 1000;
const MAX_DELAY = 300000;
const DELAY_GROWTH = 1.5;
const RESET_DELAY = 10000;
const PING_TIMEOUT = 40000; // Make this greater than server interval.

export default function Socket(url, { onUnhandled }) {
  const handlers = {};
  const buffer = [];
  let isOpen = false;
  let connDelay = 0;
  let socket;

  function start(params, callback) {
    const id = makeId();
    const request = [id, ...params];
    handlers[id] = { request, callback };
    if (isOpen) send(request);
    return id;
  }

  function stop(id) {
    delete handlers[id];
  }

  function connect() {
    socket = new WebSocket(url);
    socket.onmessage = receive;
    socket.onerror = closed;
    socket.onclose = closed;
    socket.onopen = opened;
  }

  function receive(event) {
    const [id, ...data] = JSON.parse(event.data);
    if (id === ':ping') {
      ping();
    } else if (handlers[id]) {
      handlers[id].callback(...data);
    } else {
      // We received an unexpected push.
      onUnhandled && onUnhandled(id, ...data);
    }
  }

  let connectTimer;
  let resetTimer;
  let pingTimer;

  function closed(_event) {
    if (!isOpen) {
      // We were already closed, exponential backoff.
      connDelay = Math.max(
        Math.min(MIN_DELAY, connDelay * DELAY_GROWTH),
        MAX_DELAY,
      );
    }

    isOpen = false;
    clearTimeout(connectTimer);
    clearTimeout(resetTimer);
    connectTimer = setTimeout(connect, connDelay);
  }

  function opened() {
    ping();
    isOpen = true;
    for (const id in handlers) send(handlers[id].request);
    while (buffer.length) send(buffer.shift());
    resetTimer = setTimeout(() => (connDelay = 0), RESET_DELAY);
  }

  function ping() {
    if (isOpen) send([':pong']);
    clearTimeout(pingTimer);
    pingTimer = setTimeout(() => socket.close(), PING_TIMEOUT);
  }

  function send(req) {
    if (isOpen) {
      socket.send(JSON.stringify(req));
    } else {
      buffer.push(req);
    }
  }

  connect();

  return {
    start,
    stop,
    send,
  };
}
