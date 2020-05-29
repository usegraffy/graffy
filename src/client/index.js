import httpClient from './httpClient';
import wsClient from './wsClient';

const WSRE = /^wss?:\/\//;

export default function GraffyClient(baseUrl, options) {
  if (WSRE.test(baseUrl)) {
    return wsClient(baseUrl, options);
  } else {
    return httpClient(baseUrl, options);
  }
}
