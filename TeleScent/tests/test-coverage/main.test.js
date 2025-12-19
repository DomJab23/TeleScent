const { test } = require('node:test');
const assert = require('node:assert');
const { add, isEven } = require('./main.js');

test('add() should add two numbers', () => {
  assert.strictEqual(add(1, 2), 3);
});

test('isEven() should report whether a number is even', () => {
  assert.ok(isEven(0));
});
