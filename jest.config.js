module.exports = {
  verbose: true,
  testURL: 'http://localhost/',
  rootDir: 'src',
  modulePaths: ['<rootDir>/src'],
  collectCoverage: false,
  testEnvironment: 'node',
  setupFiles: ['../scripts/jest.setup.js'],
};
