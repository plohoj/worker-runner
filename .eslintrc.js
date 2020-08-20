const tsConfig = require('./tsconfig.json');

/** @type {import('eslint').Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: { project: './tsconfig.json' },
    plugins: ['unused-imports'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/warnings',
    ],
    rules: {
        // plugin:TypeScript
        '@typescript-eslint/indent': ['warn', 4, {
            ignoredNodes: ['TSTypeParameterInstantiation', 'TSTypeParameterInstantiation TSUnionType'],
        }],
        '@typescript-eslint/quotes': ['warn', 'single' ],
        '@typescript-eslint/comma-spacing': 'warn',
        '@typescript-eslint/space-before-function-paren': ['warn', 'never'],
        '@typescript-eslint/keyword-spacing': ['warn'],
        '@typescript-eslint/adjacent-overload-signatures': 'error',
        '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
        '@typescript-eslint/no-empty-function': 'warn',
        '@typescript-eslint/no-inferrable-types': 'warn',
        '@typescript-eslint/no-this-alias': 'error',
        '@typescript-eslint/no-unused-expressions': 'error',
        '@typescript-eslint/semi': ['warn', 'always' ],
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/type-annotation-spacing': 'warn',
        '@typescript-eslint/unified-signatures': 'error',
        '@typescript-eslint/member-ordering': ['warn'],
        '@typescript-eslint/naming-convention': [
            'error',
            // Group Selectors
            { selector: 'typeLike', format: ['PascalCase'] },
            { selector: 'memberLike', format: ['camelCase'] },
            { selector: 'variableLike', format: ['camelCase'] },
            // Individual Selectors
            { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
            {
                selector: 'variable',
                types: ['boolean'],
                format: ['camelCase'],
                prefix: ['is', 'should', 'has', 'can', 'did', 'will'],
            },
            {
                selector: 'property',
                types: ['boolean'],
                format: ['camelCase'],
                prefix: ['is', 'should', 'has', 'can', 'did', 'will'],
            },
            {
                selector: 'variable',
                modifiers: ['const'],
                format: ['camelCase', 'UPPER_CASE'],
            },
            {
                selector: 'property',
                modifiers: ['readonly'],
                format: ['UPPER_CASE'],
            },
            { selector: 'property', format: ['camelCase', 'PascalCase'] },
            { selector: 'enumMember', format: ['UPPER_CASE'] },
        ],

        // plugin:import
        'import/order': ['warn', {
            alphabetize: {
                order: 'asc',
                caseInsensitive: true,
            },
        }],

        // plugin:unused-imports
        'unused-imports/no-unused-imports': 'error',

        // ESLint
        'indent': 'off',
        'quote-props': ['warn', 'consistent-as-needed' ],
        'no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 0 } ],
        'eol-last': 'warn',
        'no-trailing-spaces': 'warn',
        'comma-dangle': ['warn', 'always-multiline'],
        'key-spacing': ['warn', { mode: 'strict' }],
        'object-curly-spacing': ['warn', 'always'],
        'padded-blocks': ['warn', 'never'],
        'space-unary-ops': 'warn',
        'block-spacing': 'warn',
        'space-before-blocks': 'warn',
        'space-infix-ops': 'warn',
        'eqeqeq': 'warn',
        'no-undef-init': 'warn',
        'no-tabs': 'warn',
        'operator-linebreak': ['warn', 'before'],
        'object-curly-newline': ['warn', { multiline: true, consistent: true }],
        'one-var': ['warn', 'never' ],
        'no-duplicate-imports': 'warn',
        'sort-imports': ['warn', {
            ignoreDeclarationSort: true,
        }],
        'padding-line-between-statements': [
            'warn',
            { blankLine: 'always', prev: '*', next: 'function' },
        ],
        'brace-style': 'warn',
        'curly': 'warn',
        'new-parens': 'warn',
        'no-extra-bind': 'error',
        'no-throw-literal': 'error',
        'object-shorthand': 'warn',
        'prefer-const': 'warn',
        'prefer-object-spread': 'warn',
        'space-in-parens': 'warn',

        // Banned imports
        'no-restricted-imports': ['error', {
            patterns: [
                'rxjs/Rx',
                '@worker-runner/*/**',
                '**/modules',
                '**/../core',
                '**/../promise',
                '**/../rx',
            ],
        }],
    },
    ignorePatterns: tsConfig.exclude,

    overrides: [{ // Main configuration scripts
        files: ['./*.js'],
        env: {
            node: true,
        },
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/naming-convention': [
                'error',
                { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
            ],
        },
    }],
};
