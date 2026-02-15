// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {}, // this allows eslint-plugin-import to resolve TypeScript paths
    },
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
    'import',
    '@typescript-eslint',
    'prettier',
  ],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:prettier/recommended', // must be last
  ],
  rules: {
    // Code Style & Formatting
    'prettier/prettier': 'warn',
    'quotes': ['warn', 'single'],
    'semi': ['warn', 'always'],
    'indent': ['off'], // Let Prettier handle indentation

    // React
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/jsx-uses-react': 'off',
    'react/prop-types': 'off', // Using TS instead

    // TypeScript
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

    //  Import/Export
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index'],
          'object',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-duplicates': 'error',
    'import/first': 'error',
    'import/newline-after-import': ['warn', { count: 1 }],

    //  Accessibility (jsx-a11y)
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/alt-text': 'warn',

    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
