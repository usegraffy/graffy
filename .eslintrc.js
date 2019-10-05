module.exports = {
  "env": {
    "browser": true,
    "es6": true,
    "node": true,
    "jest": true
  },
  "extends": ["eslint:recommended", "plugin:react/recommended", "prettier"],
  "parser": "babel-eslint",
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module"
  },
  "plugins": ["react", "prettier"],
  "rules": {
    "no-console": "error",
    "prettier/prettier": "error",
    "no-unused-vars": ["error", {
      "ignoreRestSiblings": true,
      "varsIgnorePattern": "^_",
      "argsIgnorePattern": "^_",
      "caughtErrors": "all",
      "caughtErrorsIgnorePattern": "_"
    }]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
};
