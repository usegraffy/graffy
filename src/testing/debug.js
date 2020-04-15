import { keyStep } from '@graffy/common';

function escape(string) {
  // eslint-disable-next-line no-control-regex
  return string.replace(/\uffff/g, '\\FF').replace(/\u0000/g, '\\00');
}

function interval(start, finish) {
  if (start === finish) return `${start} ×`;

  const { key: key, step: kStep } = keyStep.call(null, start);
  const { key: end, step: eStep } = keyStep(finish);

  return [
    escape(key),
    kStep === 1 ? '(' : '[',
    '…',
    eStep === -1 ? ')' : ']',
    escape(end),
  ].join('');
}

export default function debug(graph, indent = '') {
  if (!graph) return graph;
  // eslint-disable-next-line no-param-reassign
  if (!Array.isArray(graph)) graph = [graph];
  if (!graph.length) return '[]';
  return (
    '\n' +
    graph
      .map(({ key, end, children, version, path, value, ...rest }) =>
        [
          `${version}`.padEnd(16),
          indent,
          end ? interval(key, end) : escape(key),
          path ? ` ➚/${path.join('/')}` : '',
          value ? ` ${JSON.stringify(value)}` : '',
          Object.keys(rest).length > 0 ? ' ' + JSON.stringify(rest) : '',
          children ? ' {' : '',
          children ? debug(children, indent + '  ') : '',
          children ? ' }' : '',
        ].join(''),
      )
      .join('\n')
  );
}
