import httpClient from './httpClient.js';
import wsClient from './wsClient.js';

const WSRE = /^wss?:\/\//;

export default function GraffyClient(baseUrl, options) {
  if (WSRE.test(baseUrl)) {
    return wsClient(baseUrl, options);
  }
  return httpClient(baseUrl, options);
}
