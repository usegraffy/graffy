import { parse } from 'graphql/language/parser';
import { empty } from '@graffy/common';

export default function toQuery(ast, vars = {}) {
  if (typeof ast === 'string') ast = parse(ast);
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

  const gfyQuery = fieldToNode(query);
  return gfyQuery;

  function fieldToNode({ /* alias, name, */ arguments: args, selectionSet }) {
    let node = {};
    // if (alias) node.alias = alias.value;

    if (selectionSet) {
      for (const field of selectionSet.selections) {
        let fragment;
        switch (field.kind) {
          case 'FragmentSpread':
            fragment = fragments[field.name.value];
            if (!fragment) throw Error(`gql.no_fragment ${field.name.value}`);
            fragment.selectionSet.selections.forEach((field) => {
              node[field.name.value] = fieldToNode(field);
            });
            break;
          case 'Field':
            node[field.name.value] = fieldToNode(field);
            break;
          default:
            unsupported(field.kind);
        }
      }
    }
    if (args && args.length) node._key_ = getArgs(args);
    return empty(node) ? 1 : node;
  }

  function getArgs(gqlArgs) {
    const args = {};
    for (const { name: n, value: v } of gqlArgs) {
      const name = n.value;
      const value = v.kind === 'Variable' ? vars[v.name.value] : v.value;
      args[name] = value;
    }
    return args;
  }
}

function unsupported(feature) {
  throw new Error(`GraphQL to Query: ${feature} is unsupported.`);
}
