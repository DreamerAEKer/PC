import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFinalPrediction, validateFinalPrediction } from '../src/utils/finalPrediction.js';

test('normalizes blank and negative prediction quantities', () => {
  assert.deepEqual(normalizeFinalPrediction('', -5), { spain: 0, argentina: 0 });
});

test('accepts prediction quantities that equal the order quantity', () => {
  const result = validateFinalPrediction({ spain: 60, argentina: 40 }, 100);
  assert.equal(result.total, 100);
  assert.equal(result.isValid, true);
});

test('rejects prediction quantities that do not equal the order quantity', () => {
  assert.equal(validateFinalPrediction({ spain: 30, argentina: 20 }, 100).isValid, false);
});
