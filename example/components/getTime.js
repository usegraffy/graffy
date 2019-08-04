export default function getTime(ts) {
  return new Date(ts).toLocaleString('en', {
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
