import httpClient from './httpClient.ts';
import wsClient from './wsClient.ts';

const WSRE = /^wss?:\/\//;

export default function GraffyClient(baseUrl, options) {
  if (WSRE.test(baseUrl)) {
    return wsClient(baseUrl, options);
  }
  return httpClient(baseUrl, options);
}
