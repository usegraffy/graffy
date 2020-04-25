export const splitPath = (path) => {
  return typeof path === 'string' ? path.split('/') : path;
};

const optional = (validate) => (value, schema) =>
  value === undefined || value === null || validate(value, schema);

const linkTo = (base) => (value, schema) => {
  if (typeof value !== 'string') return false;
  const targetType = schema.descend(splitPath(value));
  return !!targetType && targetType.base === base;
};

export function variants({ validate, ...rest }) {
  const t = { validate: optional(validate), ...rest };
  t.base = t;
  t.reqd = Object.create(t, { validate });
  t.link = Object.create(t, { validate: optional(linkTo(t)) });
  t.link.reqd = Object.create(t, { validate: linkTo(t) });
  return t;
}
