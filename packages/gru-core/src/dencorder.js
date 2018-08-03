/*
  dencorder.js
*/

import { TextEncoder, TextDecoder } from 'text-encoding-utf-8';
import { string, number, boolean } from './types';
const alpha = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

export function encodeNumber (value) {
	const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);

	view.setFloat64(0, value);

	if(value < 0) {
		view.setUint32(0, (~view.getUint32(0)) >>> 0);
		view.setUint32(4, (~view.getUint32(4)) >>> 0);
	} else {
		/* non-negative number, just set the leading bit. */
		view.setUint8(0, view.getUint8(0) | 0x80);
	}

  return new Uint8Array(buffer);
}

export function decodeNumber (array) {
  const view = new DataView(array.buffer, array.byteOffset, array.byteLength);
  const high = view.getUint8(0);

	if(high & 0x80) {
		// originally a non-negative number. Just set the sign bit back to 0.
		view.setUint8(0, high & 0x7f);
	} else {
		view.setUint32(0, (~view.getUint32(0)) >>> 0);
		view.setUint32(4, (~view.getUint32(4)) >>> 0);
	}

  return view.getFloat64(0);
}

export function encodeString(string) {
	return (new TextEncoder()).encode(string);
}

export function decodeString(buffer) {
	return (new TextDecoder()).decode(buffer);
}

export function encodeTuple(types, values) {
	const bufs = values.map((val, i) => {
		if (!types[i].validate(val)) throw new Error('ERR_VALIDATION');
		if (val === null) return [0];
		switch (types[i]) {
			case boolean: case boolean.required: return val ? [2] : [1];
			case string: case string.required: return encodeString(val + '\0');
			case number: case number.required: return encodeNumber(val);
		}
	});

	const length = bufs.reduce((l, buf) => l + (buf.byteLength || buf.length), 0);
	const array = new Uint8Array(length);
	for (let i = 0, p = 0; i < bufs.length; i++) {
		array.set(bufs[i], p);
		p += (bufs[i].byteLength || bufs[i].length);
	}
	return array;
}

export function decodeTuple(types, array) {
	const values = [];
	for (let i = 0, p = 0; i < types.length; i++) {
		if (array[p] === 0) {
			values.push(null);
			p += 1;
			continue;
		}
		switch (types[i]) {
			case boolean: case boolean.required:
				values.push(array[p] === 2 ? true : false);
				p += 1;
				break;
			case number: case number.required:
				values.push(decodeNumber(array.subarray(p, p + 8)));
				p += 8;
				break;
			case string: case string.required:
				let l = 0;
				while (array[p + l]) l++;
				values.push(decodeString(array.subarray(p, p + l)));
				p += (l + 1);
				break;
		}
	}
	return values;
}

function getByte(view, offset) {
  return offset < view.byteLength ? view.getUint8(offset) : 0;
}

function getHexad(string, offset) {
  return offset < string.length ? alpha.indexOf(string[offset]) : 0;
}

export function enc64 (array) {
  const view = new DataView(array.buffer, array.byteOffset, array.byteLength);
  let str = '';

  for (let i = 0; i < view.byteLength; i+=3) {
    let value = (
      (getByte(view, i) << 16) +
      (getByte(view, i + 1) << 8) +
      getByte(view, i + 2)
    );

		let gstr = '';
    while (value > 0) {
      gstr = alpha[value % 64] + gstr;
      value = (value / 64) | 0;
    }
		str += gstr;
  }

  return str.substr(0, Math.ceil(view.byteLength * 4 / 3));
}

export function dec64(string) {
	const buffer = new ArrayBuffer(Math.floor(string.length * 3 / 4));
  const view = new DataView(buffer);

  let carry = 0;
  for (let i = 0, j = 0; i < string.length; i+=4) {
    let value = (
      (getHexad(string, i) << 18) +
      (getHexad(string, i + 1) << 12) +
      (getHexad(string, i + 2) << 6) +
      getHexad(string, i + 3)
    );

    for (let j = i * 3 / 4 + 2; value > 0 && j >= i * 3 / 4; j--) {
      if (j < view.byteLength) view.setUint8(j, value % 256);
      value = (value / 256) | 0;
    }
  }

  return new Uint8Array(buffer);
}
