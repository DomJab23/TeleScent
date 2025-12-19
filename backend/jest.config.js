const path = require('path');

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.test.js'],
  collectCoverageFrom: [
    '<rootDir>/**/*.js',
    '!<rootDir>/node_modules/**',
    '!<rootDir>/build/**',
    '!<rootDir>/public/**',
    '!<rootDir>/jest.config.js',
    '!<rootDir>/create-admin.js',
    '!<rootDir>/**/*.test.js',
  ],
  coverageDirectory: '../tests/test-coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['js', 'json'],
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
};
