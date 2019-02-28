module.exports = {
  presets: [["@babel/preset-env", { loose: true }]],
  plugins: [
    "@babel/plugin-transform-runtime",
    "@babel/plugin-proposal-class-properties",
  ],
};
