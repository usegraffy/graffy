// import { splitPath } from './types';

const resolvers = WeakMap();

function prune(shape, value) {
  // TODO: implement
  return value;
}

async function query(shape, type, path, value) {
  const resolver = resolvers.get(type));
  if (resolver) value = await resolver.query(shape, path, value);

  if (type.isScalar && shape) return value;

  const response = {};
  for (const name in shape) {
    response[name] = query(
      shape[name],
      type.descend([ name ]),
      path.concat(type.decodeKey ? type.decodeKey(name) : name),
      value && value[name]
    );
  }
  return prune(shape, response);
}

export class SimpleResolver {
  constructor(schema) {
    this.schema = schema;
    this.resolvers = {};
  }

  use(path, resolver) {
    // path = splitPath(path);
    const type = schema.descend(path);
    if (!type) throw Error('resolver.use.schema');
    // TODO: Multiple resolvers for the same type?
    resolvers.set(type, resolver);
  }

  query(shape) {
  }
}
