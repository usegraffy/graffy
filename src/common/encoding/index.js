// Objects are encoded as an array of keys and then an array of values.

function encode(value) {
  switch(typeof value) {
    case 'number':
      return encodeNumber(value);
    case 'string':
      return encodeString(value);
    case 'undefined':
      return '';
    case 'object':
      if (value === null) return '';
      if (Array.isArray(value)) return encodeArray(value);
      throw new Error('encode.object_unsupported');
    case 'boolean':
  }
}

encodeArray(obj) {
  const keys = Object.keys(obj).sort();
  const values = keys.map(key => obj[key]);
  return [encodeArray(keys), encodeArray(values)]
}
