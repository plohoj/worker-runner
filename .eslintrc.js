const tsConfig = require('./tsconfig.json');

/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',

        'plugin:unicorn/recommended',
        'plugin:promise/recommended',
        'plugin:import/warnings',
    ],
    parserOptions: { project: './tsconfig.json' },
    rules: {
        'eol-last': 'warn',

        '@typescript-eslint/member-ordering': 'error',

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

        "unicorn/prevent-abbreviations": [
            "error",
            {
                "whitelist": {
                    "args": true
                }
            }
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
