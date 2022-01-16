const builtins = require('module').builtinModules.join('|');

module.exports = {
  env: {
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'simple-import-sort', 'import'],
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-var-requires': 'off',
    'no-return-await': 'error',
    'import/no-duplicates': 'error',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          ['^\\u0000'],
          [`^(${builtins})(/.*)?(?<!\\u0000)$`, `^(${builtins})(/.*)?\\u0000$`],
          ['(?<!\\u0000)$', '(?<=\\u0000)$'],
          ['^\\.', '^\\..*\\u0000$'],
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': ['error'],
      },
    },
  ],
  ignorePatterns: ['dist/', 'coverage/'],
};
