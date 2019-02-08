const includeRe = /([^,()]*)([(),]|$)/g;

export function getShape(include) {
  if (!include) return {};
  
  includeRe.lastIndex = 0;
  const stack = [{}];

  do {
    // eslint-disable-next-line no-unused-vars
    const [_, key, delim] = includeRe.exec(include);
    const shape = stack[stack.length - 1];

    if (key) shape[key] = true;
    switch(delim) {
    case '(':
      if (!key) throw('parse.unexpected_open');
      shape[key] = {};
      stack.push(shape[key]);
      break;
    case ')':
      if (stack.length <= 1) throw('parse.unexpected_close');
      stack.pop();
    }
  } while(includeRe.lastIndex < include.length);

  if (stack.length !== 1) throw('parse.missing_close');
  return stack[0];
}

export function getInclude(shape) {
  return Object.keys(shape)
    .sort()
    .map(key => typeof shape[key] === 'object' ? `${key}(${getInclude(shape[key])})` : key)
    .join(',');
}
