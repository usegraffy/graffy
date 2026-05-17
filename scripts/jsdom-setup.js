import { JSDOM } from 'jsdom';

const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});
for (const key of [
  'document',
  'window',
  'history',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'HTMLElement',
]) {
  try {
    global[key] = window[key];
  } catch (_) {
    // Some globals may be read-only in newer Node.js versions
  }
}
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
