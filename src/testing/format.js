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

let lastPrintedVersion;
export default function format(graph, indent = '') {
  if (!graph) return graph;
  if (indent === '') lastPrintedVersion = null;
  // eslint-disable-next-line no-param-reassign
  if (!Array.isArray(graph)) graph = [graph];
  if (!graph.length) return '[]';
  return (
    '\n' +
    graph
      .map(({ key, end, children, version, path, value, ...rest }) =>
        [
          lastPrintedVersion === version
            ? ''
            : '<@' + (lastPrintedVersion = version) + '>\n',
          indent,
          end ? interval(key, end) : escape(key),
          path ? ` ➚/${path.join('/')}` : '',
          value ? ` ${JSON.stringify(value)}` : '',
          Object.keys(rest).length > 0 ? ' ' + JSON.stringify(rest) : '',
          children ? ' {' : '',
          children ? format(children, indent + '  ') : '',
          children ? ' }' : '',
        ].join(''),
      )
      .join('\n')
  );
}
