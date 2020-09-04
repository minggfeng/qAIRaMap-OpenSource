module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    Plotly: 'readonly',
    M: 'readonly',
    io: 'readonly',
    google: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: 'module',
  },
  rules: {
    allowForLoopAfterthoughts: 0,
    'no-restricted-globals': ['error', 'event', 'fdescribe'],
    'keyword-spacing': 1,
    'space-before-function-paren': [1, 'never'],
    eqeqeq: 1,
    'space-infix-ops': 1,
    'comma-spacing': 1,
    'brace-style': 1,
    'no-multiple-empty-lines': 1,
    camelcase: 1,
    'func-call-spacing': 1,
    'key-spacing': 1,
    semi: 1,
    'no-floating-decimal': 1,
    'no-multi-spaces': 1,
    'object-property-newline': 1,
    'padded-blocks': [1, 'never'],
    'space-before-blocks': 1,
    'space-in-parens': 1,
    'spaced-comment': 1,
    quotes: [1, 'single'],
    'id-length': [0, { exceptions: ['i', 'j', 'x'] }],
    indent: [1, 2],
    'no-array-constructor': 1,
    'no-nested-ternary': 0,
    allowTernary: 0,
  },
};
