import httpClient from './httpClient';
import wsClient from './wsClient';

const WSRE = /^wss?:\/\//;

export default function GraffyClient(baseUrl, getOptions = () => ({})) {
  if (WSRE.test(baseUrl)) {
    return wsClient(baseUrl, getOptions);
  } else {
    return httpClient(baseUrl, getOptions);
  }
}
