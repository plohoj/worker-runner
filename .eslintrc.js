const tsConfig = require('./tsconfig.json');

/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: [
        'airbnb-typescript/base',
        'plugin:unicorn/recommended',
        'plugin:prettier/recommended',
        'prettier',
        'prettier/@typescript-eslint',
        // TODO Promise
    ],
    parserOptions: {
        project: './tsconfig.json',
    },
    rules: {
        'prettier/prettier': 'warn',
    },
    ignorePatterns: tsConfig.exclude,
};
