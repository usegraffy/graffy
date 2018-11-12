import { number, string, boolean, object } from './scalar';
import { tuple, struct } from './tuple';
import { map } from './map';

export function type(shape) {
  if (typeof shape !== 'object') throw Error('type.define.typeof_shape');
  if (shape.base) return shape;

  if (Array.isArray(shape)) {
    if (shape.length === 0) throw Error('type.define.shape_length');
    if (shape.length === 1) return map(type(shape[0]), boolean);
    if (shape.length === 2) return map(type(shape[0]), type(shape[1]));
    return map(
      tuple(shape.slice(0, -1).map(type)),
      type(shape[shape.length - 1])
    );
  }

  const structShape = {};
  for (const prop in shape) structShape[prop] = type(shape[prop]);
  return struct(structShape);
}

export { number, string, boolean, object, tuple, struct, map };
