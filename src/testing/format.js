function escape(string) {
  if (string === '') return "''";
  // eslint-disable-next-line no-control-regex
  return string.replace(/\uffff/g, '𝖋𝖋').replace(/\0/g, '𝖔𝖔');
}

function interval(key, end) {
  if (key === end) return `${key} ×`;

  // const { key: key, step: kStep } = keyStep.call(null, start);
  // const { key: end, step: eStep } = keyStep(finish);

  return [
    // kStep === 1 ? '(' : '[',
    escape(key),
    ' ⋯ ',
    escape(end),
    // eStep === -1 ? ')' : ']',
  ].join('');
}

let lastPrintedVersion;
export default function format(graph, indent = '') {
  if (graph?.length && !graph[0]) console.log(graph);
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
          path ? ` ➚${path.join('.')}` : '',
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

export function inspect() {
  return format(this);
}
