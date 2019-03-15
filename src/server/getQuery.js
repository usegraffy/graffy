const includeRe = /([^,()]*)([(),]|$)/g;

export default function getQuery(include) {
  if (!include) return {};

  includeRe.lastIndex = 0;
  const stack = [{}];

  do {
    // eslint-disable-next-line no-unused-vars
    const [_, key, delim] = includeRe.exec(include);
    const query = stack[stack.length - 1];

    if (key) query[key] = true;
    switch (delim) {
      case '(':
        if (!key) throw 'parse.unexpected_open';
        query[key] = {};
        stack.push(query[key]);
        break;
      case ')':
        if (stack.length <= 1) throw 'parse.unexpected_close';
        stack.pop();
    }
  } while (includeRe.lastIndex < include.length);

  if (stack.length !== 1) throw 'parse.missing_close';
  return stack[0];
}
