export default function debug(graph, indent = '') {
  return (
    '\n' +
    graph
      .map(({ key, end, children, ...props }) =>
        [
          indent,
          key,
          end ? `..${end} { ` : ' { ',
          Object.keys(props)
            .map(key => `${key}:${JSON.stringify(props[key])}`)
            .join(' '),
          children ? debug(children, indent + '  ') : '',
          ' }',
        ].join(''),
      )
      .join('\n')
  );
}
