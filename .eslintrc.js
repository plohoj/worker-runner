const tsConfig = require('./tsconfig.json');

/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',

        'plugin:unicorn/recommended',
        'plugin:promise/recommended',
        'plugin:import/warnings',
        // TODO lint rxjs
    ],
    plugins: ['es'],
    parserOptions: { project: './tsconfig.json' },
    rules: {
        'eol-last': 'warn',

        // plugin:typescript-eslint
        '@typescript-eslint/member-ordering': 'error',
        "@typescript-eslint/ban-types": ["error", {
            types: {
                Symbol: "Don't use Symbol because it causes bugs in IE11",
            }
        }],

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

        // plugin:unicorn
        "unicorn/prevent-abbreviations": [
            "error",
            {
                "allowList": {
                    "args": true
                }
            }
        ],

        // plugin:es
        'es/no-symbol': 'error',

        // Banned imports
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    'rxjs/Rx',
                    '@worker-runner/*/**',
                    '**/modules',
                    '**/../core',
                    '**/../promise',
                    '**/../rx',
                    'test/'
                ],
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
                'unicorn/prefer-module': 'off',
                'unicorn/prefer-node-protocol': 'off'
            },
        },
    ],
    ignorePatterns: tsConfig.exclude,
};
