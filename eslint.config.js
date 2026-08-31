const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

module.exports = [
  {
    // Перенесено из .eslintignore, который ESLint 9 больше не читает.
    // build/ и www/ - артефакты сборки, stockfish/ - вендорный wasm-движок.
    ignores: [
      'scripts/i18n-update.js',
      'build/**',
      'www/**',
      'stockfish/**',
    ],
  },
  {
    // Скрипт называется `eslint src/`, но без явного files ESLint 9 берёт
    // только *.js - то есть три вендорных файла из 357. Перечисляем TS явно.
    files: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      // JSX включать не нужно: парсер выводит его из расширения .tsx,
      // а на .ts флаг ecmaFeatures.jsx ломает разбор генериков.
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    linterOptions: {
      // Существующие eslint-disable гасят правила из пресетов, которых мы пока
      // не включаем (сплошной disable на вендорных .d.ts, prefer-const в socket).
      // С включённой проверкой они числятся неиспользованными, а `--fix` их
      // сносит - и они понадобятся обратно, как только пресеты появятся.
      reportUnusedDisableDirectives: 'off',
    },
    // Набор правил намеренно тот же, что был в .eslintrc.json: это перенос
    // на flat config, а не ужесточение. Готовые пресеты (@typescript-eslint
    // recommended) не подключены - их стоит вводить отдельно и осознанно.
    rules: {
      semi: 'off',
      quotes: ['error', 'single', { avoidEscape: true }],
      eqeqeq: ['error', 'smart'],
    },
  },
]
