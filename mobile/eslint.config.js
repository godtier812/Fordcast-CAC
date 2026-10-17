const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'coverage/**', '.expo/**'] },
  { rules: { 'no-restricted-imports': ['error', { patterns: ['@react-navigation/*'] }] } },
]);
