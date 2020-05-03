import TextEncoderLite from 'text-encoder-lite';

(function (g) {
  if (!g.TextEncoder || !g.TextDecoder) {
    g.TextEncoder = TextEncoderLite.TextEncoderLite;
    g.TextDecoder = TextEncoderLite.TextDecoderLite;
  }
})((typeof global !== 'undefined' && global) || window);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

export function encode(string) {
  return textEncoder.encode(string);
}

export function decode(u8Arr) {
  return textDecoder.decode(u8Arr);
}
