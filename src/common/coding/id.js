import { customAlphabet } from 'nanoid/non-secure';
import alpha from './alphabet';

// The ID is 20 digits for a similar collision probability as UUID v4
export default customAlphabet(alpha, 20);
