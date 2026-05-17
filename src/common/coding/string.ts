const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

export function encode(string) {
  return textEncoder.encode(string);
}

export function decode(u8Arr) {
  return textDecoder.decode(u8Arr);
}
