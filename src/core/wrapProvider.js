import wrappers from './wrappers.js';

export default function wrapProvider(provider, options = {}) {
  const { decode, shift, finalize, _debounce, link, _fetch, _watch } = options;

  /*
    The wrapper closest to the user-supplied provider should be applied first.
  */

  if (shift) provider = wrappers.shift(provider, shift);
  if (link) provider = wrappers.link(provider, link);
  if (finalize) provider = wrappers.finalize(provider);
  if (decode) provider = wrappers.decode(provider);
}
