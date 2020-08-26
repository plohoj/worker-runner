const tsConfig = require('./tsconfig.json');

/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',

        'plugin:unicorn/recommended',
        'plugin:promise/recommended',
        'plugin:import/warnings',

        'prettier/@typescript-eslint',
        'plugin:prettier/recommended',
        'prettier',
    ],
    parserOptions: {
        project: './tsconfig.json',
    },
    rules: {
        '@typescript-eslint/member-ordering': 'error',

        'prettier/prettier': 'warn',

        // plugin:import
        'import/order': [
            'warn',
            {
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            },
        ],

        // Banned imports
        'no-restricted-imports': [
            'error',
            {
                patterns: ['rxjs/Rx', '@worker-runner/*/**', '**/modules', '**/../core', '**/../promise', '**/../rx'],
            },
        ],
    },
    overrides: [
        {
            // Main configuration scripts
            files: ['./*.js'],
            env: {
                node: true,
            },
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
            },
        },
    ],
    ignorePatterns: tsConfig.exclude,
};
