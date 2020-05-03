export default function pretty(query) {
  return JSON.stringify(query, null, 4)
    .replace(
      /\[(\s*)([\s\S]*?)\},*/g,
      (_, space, inner) => '[' + space + inner.replace(/\n\s+/g, ' ') + '},',
    )
    .replace(
      // eslint-disable-next-line no-control-regex
      /[^\u0020-\u007e,\u000a]/g,
      (char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4),
    );
}
