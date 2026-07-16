import test from 'node:test';
import assert from 'node:assert/strict';
import { getFinalistCountries, getFinalistSettingsDocId, normalizeFinalPrediction, normalizeFinalistSettings, validateFinalPrediction } from '../src/utils/finalPrediction.js';

test('uses safe default finalist names for old settings', () => {
  assert.deepEqual(normalizeFinalistSettings({}), { firstCountry: 'สเปน', secondCountry: 'อาร์เจนตินา' });
  assert.deepEqual(getFinalistCountries({ firstCountry: 'ฝรั่งเศส', secondCountry: 'บราซิล' }).map(item => item.label), ['ฝรั่งเศส', 'บราซิล']);
  assert.equal(getFinalistSettingsDocId('10501/unsafe'), 'finalists-10501unsafe');
});

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
