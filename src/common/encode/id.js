import generate from 'nanoid/generate';
import alpha from './alphabet';

// The ID is 20 digits for a similar collision probability as UUID v4
export default function id() {
  return generate(alpha, 20);
}
