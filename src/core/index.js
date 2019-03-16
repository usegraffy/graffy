import { default as Graffy } from './Graffy';
import {
  encRange,
  decRange,
  getPage,
  makePage,
  getLink,
  makeLink,
} from './lib';

export default Graffy;
export { encRange, decRange, getPage, makePage, getLink, makeLink };

// The transpiler won't convert a mix of default and named exports
// into the usual CommonJS, so we have to do it ourselves.
if (typeof module !== 'undefined') {
  Graffy.encRange = encRange;
  Graffy.decRange = decRange;
  Graffy.getPage = getPage;
  Graffy.makePage = makePage;
  Graffy.getLink = getLink;
  Graffy.makeLink = makeLink;
  module.exports = Graffy;
}
