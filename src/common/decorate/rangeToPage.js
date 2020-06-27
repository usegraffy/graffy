import { keyStep } from '../graph';
import { decodeKey } from '../encode';

export default function rangeToPage(key, end, count) {
  const page = {};
  if (typeof count === 'number') page[count > 0 ? 'first' : 'last'] = count;
  if (key !== '') {
    const { key: k, step } = keyStep(key);
    page.after = decodeKey(k);
    if (step === 1) page.excludeAfter = true;
  }
  if (end !== '\uffff') {
    const { key: k, step } = keyStep(end);
    page.before = decodeKey(k);
    if (step === -1) page.excludeBefore = true;
  }
  return page;
}
