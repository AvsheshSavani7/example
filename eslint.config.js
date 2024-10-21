module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**'], // Add ignores if needed
  },
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    env: {
      browser: true,
    },
    rules: {
      'no-console': 'warn',
      quotes: ['error', 'single'],
    },
  },
]
