import babelJest from 'babel-jest';

export default babelJest.createTransformer({
  rootMode: 'upward',
});
