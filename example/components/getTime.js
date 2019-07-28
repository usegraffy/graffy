const rtf = new Intl.RelativeTimeFormat('en', { style: 'narrow' });
const scales = [
  [60000, 'second', 1000],
  [3600000, 'minute', 60000],
  [Infinity, 'hour', 3600000],
];

export default function getTime(ts) {
  const timeDiff = ts - Date.now();
  const [_, unit, divisor] = scales.find(([max]) => -timeDiff < max);
  return rtf.format(Math.floor(timeDiff / divisor), unit);
}
