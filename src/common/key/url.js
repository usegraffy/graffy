export function encode(query) {
  return encodeURIComponent(JSON.stringify(query));
  // return Object.keys(query)
  //   .sort()
  //   .map(key =>
  //     typeof query[key] === 'object' ? `${key}(${encode(query[key])})` : key,
  //   )
  //   .join(',');
}

// const includeRe = /([^,()]*)([(),]|$)/g;

export function decode(fields) {
  return JSON.parse(decodeURIComponent(fields));
  // if (!include) return {};
  //
  // includeRe.lastIndex = 0;
  // const stack = [{}];
  //
  // do {
  //   // eslint-disable-next-line no-unused-vars
  //   const [_, key, delim] = includeRe.exec(include);
  //   const query = stack[stack.length - 1];
  //
  //   if (key) query[key] = true;
  //   switch (delim) {
  //     case '(':
  //       if (!key) throw 'parse.unexpected_open';
  //       query[key] = {};
  //       stack.push(query[key]);
  //       break;
  //     case ')':
  //       if (stack.length <= 1) throw 'parse.unexpected_close';
  //       stack.pop();
  //   }
  // } while (includeRe.lastIndex < include.length);
  //
  // if (stack.length !== 1) throw 'parse.missing_close';
  // return stack[0];
}
