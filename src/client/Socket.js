/*
  This class implements a self-healing wrapper around a WebSocket, with
  a higher level concept of "requests". Requests are retried when a connection
  reconnects.

  This implements reconnection with exponential backoff that is designed to
  work reasonably well on platforms that may "forget" long-running timers
  such as React Native.

  The isAlive exported function may be called in situations such as the app
  being restored, where timers may have been forgotten.
*/
import { makeId, serialize, deserialize } from '@graffy/common';
import debug from 'debug';

const log = debug('graffy:client:socket');
// eslint-disable-next-line no-console
log.log = console.log.bind(console);

const MIN_DELAY = 1000;
const MAX_DELAY = 300000;
const DELAY_GROWTH = 1.5;
const INTERVAL = 2000;
const PING_TIMEOUT = 40000; // Make this greater than server interval.
const RESET_TIMEOUT = 10000;

export default function Socket(url, { onUnhandled, onStatusChange } = {}) {
  const handlers = {};
  const buffer = [];
  let isOpen = false;
  let isConnecting = false;
  let socket;

  let lastAlive;
  let lastAttempt;
  let attempts = 0;

  let connectTimer;
  let aliveTimer;

  function start(params, callback) {
    const id = makeId();
    const request = [id, ...params];
    handlers[id] = { request, callback };
    if (isAlive()) send(request);
    return id;
  }

  function stop(id, params) {
    delete handlers[id];
    if (params) send([id, ...params]);
  }

  function connect() {
    log('Trying to connect to', url);
    isOpen = false;
    isConnecting = true;
    lastAttempt = Date.now();
    attempts++;

    socket = new WebSocket(url);
    socket.onmessage = received;
    socket.onerror = closed;
    socket.onclose = closed;
    socket.onopen = opened;
  }

  function received(event) {
    const [id, ...data] = deserialize(event.data);
    setAlive();
    if (id === ':ping') {
      send([':pong']);
    } else if (handlers[id]) {
      handlers[id].callback(...data);
    } else {
      // We received an unexpected push.
      onUnhandled && onUnhandled(id, ...data);
    }
  }

  function closed(_event) {
    log('Closed');
    if (isOpen && onStatusChange) onStatusChange(false);

    const wasOpen = isOpen;
    isOpen = false;
    isConnecting = false;
    lastAttempt = Date.now();

    if (wasOpen && !attempts) {
      // Quick reconnect path if we previously had a stable connection.
      connect();
      return;
    }

    maybeConnect();
  }

  function maybeConnect() {
    const connDelay =
      lastAttempt +
      Math.min(MAX_DELAY, MIN_DELAY * Math.pow(DELAY_GROWTH, attempts)) -
      Date.now();

    log('Will reconnect in', connDelay, 'ms');

    if (connDelay <= 0) {
      connect();
      return;
    }

    clearTimeout(connectTimer);
    connectTimer = setTimeout(connect, connDelay);
  }

  function opened() {
    log('Connected', buffer.length, Object.keys(handlers).length);
    isOpen = true;
    isConnecting = false;
    lastAttempt = Date.now();
    setAlive();
    if (onStatusChange) onStatusChange(true);

    for (const id in handlers) send(handlers[id].request);
    while (buffer.length) send(buffer.shift());
  }

  function setAlive() {
    lastAlive = Date.now();
    log('Set alive', lastAlive - lastAttempt);
    if (lastAlive - lastAttempt > RESET_TIMEOUT) attempts = 0;
  }

  function isAlive() {
    log('Liveness check', isOpen ? 'open' : 'closed', Date.now() - lastAlive);

    clearTimeout(aliveTimer);
    aliveTimer = setTimeout(isAlive, INTERVAL);

    if (!isOpen) {
      if (!isConnecting) maybeConnect();
      return false;
    }
    if (Date.now() - lastAlive < PING_TIMEOUT) return true;
    socket.close();
    return false;
  }

  function send(req) {
    if (isAlive()) {
      socket.send(serialize(req));
    } else {
      buffer.push(req);
    }
  }

  connect();
  aliveTimer = setTimeout(isAlive, INTERVAL);

  return {
    start,
    stop,
    isAlive,
  };
}
