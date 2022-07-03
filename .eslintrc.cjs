// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const tsConfig = require('./tsconfig.json');

/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        "plugin:@typescript-eslint/recommended-requiring-type-checking",

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
        '@typescript-eslint/member-ordering': [
            "error",
            {
                "default": [
                    // Index signature
                    "signature",
                
                    // Fields
                    "public-static-field",
                    "protected-static-field",
                    "private-static-field",
                
                    "public-decorated-field",
                    "protected-decorated-field",
                    "private-decorated-field",
                
                    "public-instance-field",
                    "protected-instance-field",
                    "private-instance-field",
                
                    "public-abstract-field",
                    "protected-abstract-field",
                    "private-abstract-field",
                
                    "public-field",
                    "protected-field",
                    "private-field",
                
                    "static-field",
                    "instance-field",
                    "abstract-field",
                
                    "decorated-field",
                
                    "field",
                
                    // Constructors
                    "public-constructor",
                    "protected-constructor",
                    "private-constructor",
                
                    "constructor",
                
                    // Getters and Setter
                    [
                        "static-get",
                        "static-set",
                    ],
                    [
                        "decorated-get",
                        "decorated-set",
                        "instance-get",
                        "instance-set",
                        "abstract-get",
                        "abstract-set",
                    ],
                    [
                        "get",
                        "set",
                    ],
                
                    // Methods
                    "public-static-method",
                    "protected-static-method",
                    "private-static-method",
                
                    "public-decorated-method",
                    "protected-decorated-method",
                    "private-decorated-method",
                
                    "public-instance-method",
                    "protected-instance-method",
                    "private-instance-method",
                
                    "public-abstract-method",
                    "protected-abstract-method",
                    "private-abstract-method",
                
                    "public-method",
                    "protected-method",
                    "private-method",
                
                    "static-method",
                    "instance-method",
                    "abstract-method",
                
                    "decorated-method",
                
                    "method"
                ],
            },
        ],
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
            files: ['./*.js', './*.cjs', './tools/*.js'],
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    ignorePatterns: tsConfig.exclude,
};
