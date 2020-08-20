import TextEncoderLite from 'text-encoder-lite';
import window from 'global/window';

if (!window.TextEncoder || !window.TextDecoder) {
  window.TextEncoder = TextEncoderLite.TextEncoderLite;
  window.TextDecoder = TextEncoderLite.TextDecoderLite;
}

const textEncoder = window.TextEncoder
  ? new window.TextEncoder()
  : new TextEncoderLite.TextEncoderLite();

const textDecoder = window.TextDecoder
  ? new window.TextDecoder('utf-8')
  : new TextEncoderLite.TextDecoderLite('utf-8');

export function encode(string) {
  return textEncoder.encode(string);
}

export function decode(u8Arr) {
  return textDecoder.decode(u8Arr);
}
