export default function getPath(query) {
  return Object.keys(query)
    .sort()
    .map(key =>
      typeof query[key] === 'object' ? `${key}(${getPath(query[key])})` : key,
    )
    .join(',');
}
