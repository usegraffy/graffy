function setOnce(slotName, acc, prop, name) {
  if (acc[prop]) {
    throw Error(
      `stddb.options.duplicate: Both ${acc[prop]} and ${name} map to ${slotName}`,
    );
  }
  acc[prop] = name;
}

function pushValue(acc, prop, value) {
  acc[prop] = acc[prop] || [];
  acc[prop].push(value);
}

/*
  Normalizes options and adds idCol, defCol, verCol, props and args
  args: { <argname>: { role: 'gin' | 'tsv' | 'trgm', name: <columnName> } }
  props: { <propname>: { ['data'|'gin'|'tsv'|'trgm']: <columnName> } }
*/

export default function (prefix, { table, columns = {}, links = {}, ...rest }) {
  table = table || prefix[prefix.length - 1] || 'default';

  const {
    cols,
    idCol = 'id',
    defCol = 'data',
    verCol = 'version',
    props,
    args,
  } = Object.entries(columns).reduce(
    (acc, [name, { role, prop, props, arg }]) => {
      if (role === 'primary') setOnce(`${table} primary`, acc, 'idCol', name);
      if (role === 'default') setOnce(`${table} default`, acc, 'defCol', name);
      if (role === 'version') setOnce(`${table} version`, acc, 'verCol', name);

      if (role === 'simple' || role === 'primary') {
        prop = prop || name;
        acc.props[prop] = acc.props[prop] || {};
        setOnce(`${table}/${prop}:${role}`, acc.props[prop], 'data', name);
        acc.cols[name] = { role, prop };
      }

      if (role === 'gin' || role === 'trgm' || role === 'tsv') {
        arg = arg || name;
        props = props || [];
        for (const iProp of props) {
          acc.props[iProp] = acc.props[iProp] || {};
          pushValue(acc.props[iProp], role, name);
          if (role === 'gin') {
            setOnce(`${table} arg ${iProp}`, acc.args, iProp, { role, name });
          }
        }
        if (role !== 'gin') {
          setOnce(`${table} arg ${arg}`, acc.args, arg, { role, name });
        }
      }

      return acc;
    },
    { cols: {}, props: {}, args: {} },
  );

  return {
    ...rest,
    prefix,
    table,
    columns,
    links,
    cols,
    props,
    args,
    idCol,
    defCol,
    verCol,
  };
}
