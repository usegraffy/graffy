import { encode, decode, ExtensionCodec } from '@msgpack/msgpack';

const extensionCodec = new ExtensionCodec();

extensionCodec.register({
  type: MYTYPE_EXT_TYPE,
  encode: (object, context) => {
    if (object instanceof MyType) {
      context.track(object); // <-- like this
      return encode(object.toJSON(), { extensionCodec, context });
    } else {
      return null;
    }
  },
  decode: (data, extType, context) => {
    const decoded = decode(data, { extensionCodec, context });
    const my = new MyType(decoded);
    context.track(my); // <-- and like this
    return my;
  },
});

function serialize(tree) {}

export function deserialize(tree) {}
