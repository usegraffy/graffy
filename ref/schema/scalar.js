import { encodeNumber, decodeNumber } from './dencorder';
import { variants } from './variants';

const base = (type) => ({
  validate(value) {
    return typeof value === type;
  },
  descend(path) {
    return path.length ? undefined : this;
  },
  isScalar: true,
});

export const string = variants({
  ...base('string'),
  intoKey(val, arr) {
    arr.push(val);
  },
  fromKey(arr) {
    return arr.pop();
  },
  min: '',
  max: '\uffff',
  // Technically the "highest" possible string is infinitely long,
  // but because of how JS string comparison works and the fact that
  // Unicode has not allocated codepoint 65,535, this "string" will
  // compare higher than all valid unicode strings.
});

export const number = variants({
  ...base('number'),
  intoKey(val, arr) {
    if (isNaN(val)) throw new Error('number.intoKey.nan');
    arr.push(encodeNumber(val));
  },
  fromKey(arr) {
    return decodeNumber(arr.pop());
  },
  min: -Infinity,
  max: +Infinity,
});

// TODO properly encode a 32-bit unsigned integer.
export const count = number;

export const boolean = variants({
  ...base('boolean'),
  intoKey(val, arr) {
    arr.push(val ? '1' : '0');
  },
  fromKey(arr) {
    return arr.pop() === '1' ? true : false;
  },
  min: false,
  max: true,
});

// A JSON object, which Graffy should treat as a value.
export const object = variants({
  ...base('object'),
  intoKey() {
    throw new Error('object.intoKey');
  },
  fromKey() {
    throw new Error('object.fromKey');
  },
});
