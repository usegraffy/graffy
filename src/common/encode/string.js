(function(g) {
  if (!g.TextEncoder || !g.TextDecoder) {
    const { TextEncoderLite, TextDecoderLite } = require('text-encoder-lite');
    g.TextEncoder = TextEncoderLite;
    g.TextDecoder = TextDecoderLite;
  }
})(global || window || this);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

export function encode(string) {
  return textEncoder.encode(string);
}

export function decode(u8Arr) {
  return textDecoder.decode(u8Arr);
}
