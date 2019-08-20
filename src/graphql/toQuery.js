const MAX_PAGE_SIZE = 1024;

export default function toQuery(ast, vars = {}, version = 0) {
  if (!ast || ast.kind !== 'Document') {
    throw Error('graphql.invalid ' + JSON.stringify(ast));
  }

  let fragments = {};
  let query;

  for (const def of ast.definitions) {
    switch (def.kind) {
      case 'OperationDefinition':
        if (def.operation !== 'query') continue;
        for (const { variable, defaultValue } of def.variableDefinitions) {
          const name = variable.name.value;
          const value = defaultValue.value;
          if (typeof vars[name] === 'undefined') vars[name] = value;
        }
        query = def;
        break;
      case 'FragmentDefinition':
        fragments[def.name.value] = def;
        break;
      default:
        unsupported(def.kind);
    }
  }

  return fieldToNode(query).children;

  function fieldToNode({ alias, name, arguments: args, selectionSet }) {
    let node = { version };
    if (alias) node.alias = alias.value;
    if (selectionSet) {
      node.children = [];
      for (const field of selectionSet.selections) {
        let fragment;
        switch (field.kind) {
          case 'FragmentSpread':
            fragment = fragments[field.name.value];
            if (!fragment) throw Error(`gql.no_fragment ${field.name.value}`);
            node.children.push(
              ...fragment.selectionSet.selections.map(fieldToNode),
            );
            break;
          case 'Field':
            node.children.push(fieldToNode(field));
            break;
          default:
            unsupported(field.kind);
        }
      }
    } else {
      node.num = 1;
    }
    if (args && args.length) {
      addArgsToNode(node, args);
      node = { key: name.value, version, children: [node] };
    } else {
      if (name) node.key = name.value;
    }
    return node;
  }

  function addArgsToNode(node, gqlArgs) {
    let filter;
    let page;
    for (const { name: n, value: v } of gqlArgs) {
      const name = n.value;
      const value = v.kind === 'Variable' ? vars[v.name.value] : v.value;
      switch (name) {
        case 'after':
        case 'before':
        case 'first':
        case 'last':
          page = page || {};
          page[name] = value;
          break;
        default:
          if (typeof filter !== 'undefined') {
            unsupported('Multiple non-pagination parameters');
          }
          filter = value;
      }
    }
    const prefix = filter ? JSON.stringify(filter) : ''; // TODO: Make this better.
    if (page) {
      node.key = prefix + (page.after || '');
      node.end = prefix + (page.before || '\uffff');
      node.count = page.first || -page.last || MAX_PAGE_SIZE;
    } else {
      node.key = prefix;
    }
  }
}

function unsupported(feature) {
  throw new Error(`GraphQL to Query: ${feature} is unsupported.`);
}
